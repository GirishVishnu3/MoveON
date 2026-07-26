from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.authentication.jwt import get_current_user, RoleChecker
from app.models.user import RoleEnum
from app.models.booking import BookingStatus
from app.schemas.trip import TripStatusUpdateRequest, TripLocationUpdateRequest, FinalFareRequest
from app.repositories.booking import BookingRepository
from app.repositories.trip import TripRepository
from app.services.trip_service import TripService
from app.services.fare_service import FareService
from app.routers.websocket import manager as ws_manager

router = APIRouter(prefix="/trip", tags=["Trip Execution"])


@router.post("/{booking_ref}/status")
async def update_trip_status(
    booking_ref: str,
    request: TripStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update the status of a trip (e.g. DRIVER_ARRIVED, TRIP_STARTED, COMPLETED)."""
    booking_repo = BookingRepository(db)
    trip_repo = TripRepository(db)
    trip_service = TripService(booking_repo, trip_repo)
    
    is_driver = current_user.role == RoleEnum.DRIVER
    
    success, booking, message = await trip_service.update_trip_status(
        booking_ref, request.status, str(current_user.id), is_driver
    )
    
    if not success:
        raise HTTPException(status_code=409, detail=message)

    # Broadcast to both rider and driver
    event_data = {
        "type": "TRIP_STATUS_UPDATED",
        "booking_ref": booking_ref,
        "status": request.status.value,
        "message": message
    }
    
    # Send to Rider
    await ws_manager.send_personal_message(event_data, f"rider_{booking_ref}")
    # Send to Driver
    if booking.driver_id:
        await ws_manager.send_personal_message(event_data, f"driver_{booking.driver_id}")

    return {"message": "Status updated", "status": request.status.value}


@router.post("/{booking_ref}/location")
async def update_driver_location(
    booking_ref: str,
    request: TripLocationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(RoleChecker([RoleEnum.DRIVER]))
):
    """Driver continuously pushes their GPS location here."""
    booking_repo = BookingRepository(db)
    trip_repo = TripRepository(db)
    trip_service = TripService(booking_repo, trip_repo)

    try:
        loc = await trip_service.process_location_update(
            booking_ref=booking_ref,
            driver_id=str(current_user.id),
            lat=request.latitude,
            lon=request.longitude,
            speed=request.speed,
            heading=request.heading,
            accuracy=request.accuracy
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    booking = await booking_repo.get_booking_by_ref(booking_ref)
    
    # Mock ETA Calculation based on current status
    eta_minutes = None
    target_lat = None
    target_lon = None
    
    if booking.status in [BookingStatus.DRIVER_ASSIGNED, BookingStatus.DRIVER_EN_ROUTE]:
        target_lat = booking.pickup_lat
        target_lon = booking.pickup_lon
    elif booking.status in [BookingStatus.PASSENGER_ONBOARDED, BookingStatus.TRIP_STARTED, BookingStatus.TRIP_IN_PROGRESS]:
        target_lat = booking.destination_lat
        target_lon = booking.destination_lon
        
    if target_lat and target_lon:
        _, eta_minutes = TripService.calculate_eta_mock(
            request.latitude, request.longitude, target_lat, target_lon
        )

    # Broadcast location and ETA to Rider
    event_data = {
        "type": "DRIVER_LOCATION_UPDATE",
        "booking_ref": booking_ref,
        "lat": request.latitude,
        "lon": request.longitude,
        "heading": request.heading,
        "speed": request.speed,
        "eta_minutes": eta_minutes
    }
    
    await ws_manager.send_personal_message(event_data, f"rider_{booking_ref}")

    return {"message": "Location updated", "eta_minutes": eta_minutes}


@router.post("/{booking_ref}/complete")
async def complete_trip(
    booking_ref: str,
    request: FinalFareRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(RoleChecker([RoleEnum.DRIVER]))
):
    """Finalize the trip and calculate final fare metrics."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_booking_by_ref(booking_ref)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if str(booking.driver_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized as the assigned driver")
        
    # Calculate final fare
    final_fare_data = FareService.calculate_final_fare(
        ride_type=booking.ride_type,
        vehicle_category=booking.vehicle_category,
        actual_distance_km=request.actual_distance_km,
        actual_duration_min=request.actual_duration_min,
        toll_charges=request.toll_charges,
        parking_charges=request.parking_charges
    )
    
    # Update Booking record
    booking.actual_distance_km = request.actual_distance_km
    booking.actual_duration_min = request.actual_duration_min
    booking.final_fare = final_fare_data["total_fare"]
    
    await db.commit()
    
    # Transition to COMPLETED
    trip_repo = TripRepository(db)
    trip_service = TripService(booking_repo, trip_repo)
    await trip_service.update_trip_status(booking_ref, BookingStatus.COMPLETED, str(current_user.id), True)
    
    event_data = {
        "type": "TRIP_COMPLETED",
        "booking_ref": booking_ref,
        "final_fare": final_fare_data["total_fare"]
    }
    
    await ws_manager.send_personal_message(event_data, f"rider_{booking_ref}")
    
    return {"message": "Trip completed", "final_fare": final_fare_data}


@router.get("/{booking_ref}/timeline")
async def get_trip_timeline(
    booking_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Retrieve the trip status history timeline."""
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_booking_by_ref(booking_ref)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Lazy loading or simple query for history (Need actual SQLAlchemy query to load history here if lazy='select')
    # Since we want to keep it simple, we can query it directly
    from sqlalchemy.future import select
    from sqlalchemy import asc
    from app.models.booking import BookingStatusHistory
    
    result = await db.execute(
        select(BookingStatusHistory)
        .where(BookingStatusHistory.booking_id == booking.id)
        .order_by(asc(BookingStatusHistory.changed_at))
    )
    history = result.scalars().all()
    
    events = [
        {
            "old_status": h.old_status.value if h.old_status else None,
            "new_status": h.new_status.value,
            "changed_at": h.changed_at.isoformat(),
            "reason": h.reason
        }
        for h in history
    ]
    
    return {"booking_ref": booking_ref, "events": events}

@router.post("/{booking_ref}/sos")
async def activate_sos(
    booking_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Activate SOS mode for a trip."""
    booking_repo = BookingRepository(db)
    trip_repo = TripRepository(db)
    trip_service = TripService(booking_repo, trip_repo)
    
    is_driver = current_user.role == RoleEnum.DRIVER
    
    success, booking, message = await trip_service.update_trip_status(
        booking_ref, BookingStatus.SOS_ACTIVE, str(current_user.id), is_driver
    )
    
    if not success:
        raise HTTPException(status_code=409, detail=message)
        
    event_data = {
        "type": "SOS_ACTIVATED",
        "booking_ref": booking_ref,
        "initiated_by": "driver" if is_driver else "rider",
        "message": "Emergency SOS activated"
    }
    
    # Broadcast widely
    await ws_manager.send_personal_message(event_data, f"rider_{booking_ref}")
    if booking.driver_id:
        await ws_manager.send_personal_message(event_data, f"driver_{booking.driver_id}")
        
    return {"message": "SOS Activated successfully"}
