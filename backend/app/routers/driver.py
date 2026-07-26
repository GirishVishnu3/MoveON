from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.services.driver_availability_service import DriverAvailabilityService
from app.models.booking import Booking, BookingStatus
from app.models.driver import Driver
from app.models.user import User
from app.routers.websocket import manager as ws_manager
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/driver", tags=["Driver"])

class StatusUpdateRequest(BaseModel):
    is_online: bool
    vehicle_category: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class LocationUpdateRequest(BaseModel):
    lat: float
    lon: float

class AcceptRideRequest(BaseModel):
    booking_ref: str
    phone_number: Optional[str] = None
    driver_id: Optional[str] = None

@router.post("/{driver_id}/status")
async def update_status(driver_id: str, request: StatusUpdateRequest, db: AsyncSession = Depends(get_db)):
    service = DriverAvailabilityService(db)
    driver = await service.update_status(driver_id, request.is_online, request.vehicle_category, request.lat, request.lon)
    return {"message": "Status updated", "driver_id": driver.driver_id, "is_online": driver.is_online, "current_workload": driver.current_workload}

@router.post("/{driver_id}/location")
async def update_location(driver_id: str, request: LocationUpdateRequest, db: AsyncSession = Depends(get_db)):
    service = DriverAvailabilityService(db)
    driver = await service.update_location(driver_id, request.lat, request.lon)
    
    # Broadcast to any rider currently tracking this driver's active trip
    result = await db.execute(
        select(Booking)
        .where(Booking.driver_id == driver.id)
        .where(Booking.status.in_([BookingStatus.DRIVER_ASSIGNED, BookingStatus.ARRIVED, BookingStatus.ON_TRIP]))
    )
    active_bookings = result.scalars().all()
    
    for booking in active_bookings:
        await ws_manager.send_personal_message({
            "type": "LOCATION_UPDATE",
            "lat": request.lat,
            "lon": request.lon,
            "driver_id": driver_id,
            "booking_ref": booking.booking_ref
        }, f"rider_{booking.booking_ref}")
        
    return {"message": "Location updated", "lat": driver.lat, "lon": driver.lon}

@router.get("/available-rides")
async def get_available_rides(db: AsyncSession = Depends(get_db)):
    """Fetch active ride requests looking for drivers."""
    result = await db.execute(
        select(Booking)
        .where(Booking.status.in_([BookingStatus.SEARCHING, BookingStatus.PENDING]))
        .order_by(Booking.created_at.desc())
        .limit(20)
    )
    bookings = result.scalars().all()

    output = []
    for b in bookings:
        # Fetch rider info if available
        rider_res = await db.execute(select(User).where(User.id == b.rider_id))
        rider = rider_res.scalars().first()

        output.append({
            "id": str(b.id),
            "booking_ref": b.booking_ref,
            "ride_type": b.ride_type.value if hasattr(b.ride_type, "value") else str(b.ride_type),
            "vehicle_category": b.vehicle_category.value if hasattr(b.vehicle_category, "value") else str(b.vehicle_category),
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "pickup_address": b.pickup_address,
            "destination_address": b.destination_address,
            "pickup_lat": b.pickup_lat,
            "pickup_lon": b.pickup_lon,
            "distance_km": b.distance_km or 12.5,
            "duration_min": b.duration_min or 25.0,
            "fare": b.final_fare or 350.0,
            "payment_method": b.payment_method or "CASH",
            "rider_name": rider.full_name if rider else "Rider",
            "rider_phone": rider.phone_number if rider else "",
            "created_at": b.created_at.isoformat() if b.created_at else "",
        })

    return output

@router.post("/accept-ride")
async def accept_ride(request: AcceptRideRequest, db: AsyncSession = Depends(get_db)):
    """Driver accepts a ride request."""
    result = await db.execute(select(Booking).where(Booking.booking_ref == request.booking_ref))
    booking = result.scalars().first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found.")

    if booking.status not in [BookingStatus.SEARCHING, BookingStatus.PENDING]:
        raise HTTPException(status_code=409, detail=f"Booking is already in status {booking.status}.")

    # Lookup driver
    driver = None
    if request.driver_id:
        d_res = await db.execute(select(Driver).where(Driver.id == request.driver_id))
        driver = d_res.scalars().first()
    elif request.phone_number:
        d_res = await db.execute(select(Driver).where(Driver.phone_number == request.phone_number))
        driver = d_res.scalars().first()

    if not driver:
        # Fallback to get latest driver if not passed
        d_res = await db.execute(select(Driver).order_by(Driver.created_at.desc()))
        driver = d_res.scalars().first()

    booking.status = BookingStatus.DRIVER_ASSIGNED
    if driver:
        booking.driver_id = driver.id

    await db.commit()

    # Broadcast notification to rider socket channel
    await ws_manager.send_personal_message({
        "type": "DRIVER_ASSIGNED",
        "driver_id": str(driver.id) if driver else "",
        "driver_name": f"{driver.first_name} {driver.last_name}" if driver else "Verified Driver",
        "phone_number": driver.phone_number if driver else "",
        "booking_ref": booking.booking_ref
    }, f"rider_{booking.booking_ref}")

    return {
        "message": f"Ride {booking.booking_ref} accepted successfully!",
        "booking_ref": booking.booking_ref,
        "status": "DRIVER_ASSIGNED",
        "driver_name": f"{driver.first_name} {driver.last_name}" if driver else "Verified Driver"
    }
