from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.authentication.jwt import get_current_user, RoleChecker
from app.models.user import RoleEnum
from app.models.booking import BookingStatus
from app.schemas.booking import (
    BookingCreateRequest, BookingResponse, FareEstimateResponse,
    CouponValidateRequest, CouponValidateResponse, FareEstimateRequest
)
from app.repositories.booking import BookingRepository
from app.repositories.driver import DriverRepository
from app.services.fare_service import FareService
from app.services.location_service import LocationService
from app.services.vehicle_service import VehicleService
from app.services.coupon_service import CouponService
from app.services.booking_service import BookingService
from app.services.schedule_service import ScheduleService
from app.services.dispatch_engine import DispatchEngine
from app.routers.websocket import manager as ws_manager
from pydantic import BaseModel
from typing import Optional
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/booking", tags=["Booking"])


class RejectRequest(BaseModel):
    reason: Optional[str] = "Driver declined"


@router.post("/estimate")
async def estimate_fare(request: FareEstimateRequest, db: AsyncSession = Depends(get_db)):
    """
    Accepts pickup lat/lon, distance, duration, and ride_type.
    Backend:
      1. Resolves city from lat/lon via reverse geocoding.
      2. Loads all applicable PricingRuleVersions for available vehicle categories.
      3. Runs the full 12-step pricing engine per category.
      4. Returns a list of vehicle options with fare breakdowns.
    """
    estimate_id = str(uuid.uuid4())

    # Resolve city (non-fatal — falls back to global rules if geocoding fails)
    city = None
    city_id = None
    try:
        if request.pickup_lat and request.pickup_lon:
            city = await LocationService.resolve_city_from_coords(db, request.pickup_lat, request.pickup_lon)
            city_id = str(city.id) if city else None
            if city:
                logger.info(f"[Estimate] Resolved city: {city.name} ({city_id})")
            else:
                logger.info("[Estimate] City not resolved — using global pricing rules")
    except Exception as e:
        logger.warning(f"[Estimate] City resolution failed (non-fatal): {e}")

    distance_km = request.distance_km or 10.0
    duration_min = request.duration_min or 30.0

    # Compute fare for each configured vehicle category
    all_fares = await FareService.estimate_all_categories(
        db=db,
        ride_type=request.ride_type,
        distance_km=distance_km,
        duration_min=duration_min,
        city_id=city_id,
        is_round_trip=getattr(request, "is_round_trip", False),
        is_airport_pickup=getattr(request, "is_airport_pickup", False),
        is_airport_drop=getattr(request, "is_airport_drop", False),
    )

    if not all_fares:
        raise HTTPException(
            status_code=422,
            detail=(
                "No pricing rules are configured. "
                "Please seed the database or add rules via the admin pricing panel."
            )
        )

    # Merge with vehicle metadata from VehicleService
    vehicles = VehicleService.get_available_vehicles(request.ride_type, request.pickup_lat, request.pickup_lon)
    vehicle_meta = {v["category"]: v for v in vehicles}

    vehicles_with_fares = []
    for fare in all_fares:
        cat = fare.get("vehicle_category")
        meta = vehicle_meta.get(cat)
        if not meta:
            # Skip this category because it's not available for this ride type
            continue
            
        vehicles_with_fares.append({
            **meta,
            "fare": fare["total_fare"],
            "fare_breakdown": fare,
            "vehicle_category": cat,
        })

    return {
        "estimate": {
            "id": estimate_id,
            "distance_km": distance_km,
            "duration_min": duration_min,
            "city": city.name if city else "Global",
        },
        "vehicles": vehicles_with_fares,
    }



@router.post("/coupon/validate", response_model=CouponValidateResponse)
async def validate_coupon(request: CouponValidateRequest, db: AsyncSession = Depends(get_db)):
    repo = BookingRepository(db)
    coupon = await repo.get_coupon_by_code(request.code)
    valid, discount, message = CouponService.validate_coupon(coupon, request.fare_amount)
    return {"valid": valid, "discount_amount": discount, "message": message}


@router.post("/confirm", response_model=BookingResponse)
async def confirm_booking(
    request: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if request.scheduled_at and not ScheduleService.validate_schedule(request.scheduled_at):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    repo = BookingRepository(db)
    service = BookingService(repo)

    pref_id = None
    if request.preferences:
        pref = await repo.create_preferences(request.preferences.dict())
        pref_id = pref.id

    booking = await service.create_booking(current_user.id, request.dict(), pref_id)

    # Fire dispatch engine in background (non-blocking)
    await DispatchEngine.start_dispatch(
        booking_ref=booking.booking_ref,
        pickup_lat=booking.pickup_lat,
        pickup_lon=booking.pickup_lon,
        vehicle_category=booking.vehicle_category.value if hasattr(booking.vehicle_category, 'value') else str(booking.vehicle_category)
    )

    return booking


@router.get("/{booking_ref}", response_model=BookingResponse)
async def get_booking(
    booking_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    repo = BookingRepository(db)
    booking = await repo.get_booking_by_ref(booking_ref)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.rider_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return booking


@router.post("/{booking_ref}/accept")
async def accept_booking(
    booking_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(RoleChecker([RoleEnum.DRIVER]))
):
    """Driver accepts a ride request."""
    repo = BookingRepository(db)
    booking = await repo.get_booking_by_ref(booking_ref)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.SEARCHING:
        raise HTTPException(status_code=409, detail="Booking is no longer available")

    # Atomically assign driver
    updated = await repo.update_booking_status_by_ref(booking_ref, BookingStatus.DRIVER_ASSIGNED, f"Accepted by driver {current_user.id}")
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update booking")

    # Update driver workload
    driver_repo = DriverRepository(db)
    await driver_repo.upsert_driver_status(str(current_user.id), current_workload="ON_TRIP")

    # Notify rider via WebSocket
    await ws_manager.send_personal_message({
        "type": "DRIVER_ASSIGNED",
        "driver_id": str(current_user.id),
        "driver_name": current_user.full_name or "Your Driver",
        "booking_ref": booking_ref
    }, f"rider_{booking_ref}")

    return {"message": "Ride accepted", "booking_ref": booking_ref}


@router.post("/{booking_ref}/reject")
async def reject_booking(
    booking_ref: str,
    request: RejectRequest = RejectRequest(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(RoleChecker([RoleEnum.DRIVER]))
):
    """Driver rejects a ride request — dispatch engine will move to the next driver."""
    return {"message": "Ride rejected", "booking_ref": booking_ref}


@router.post("/{booking_ref}/cancel")
async def cancel_booking(
    booking_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Rider or driver cancels the booking."""
    repo = BookingRepository(db)
    booking = await repo.get_booking_by_ref(booking_ref)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.rider_id) != str(current_user.id) and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
        raise HTTPException(status_code=409, detail=f"Cannot cancel booking in status: {booking.status}")

    await repo.update_booking_status_by_ref(booking_ref, BookingStatus.CANCELLED, "Cancelled by user")
    return {"message": "Booking cancelled", "booking_ref": booking_ref}

