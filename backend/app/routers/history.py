from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.models.booking import Booking, BookingStatus
from app.schemas.rating import ReviewSubmitRequest
from app.services.rating_service import RatingService

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/trips")
async def get_trip_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Fetch completed or cancelled trips for this user (rider or driver)
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.payments), selectinload(Booking.reviews))
        .where(
            or_(Booking.rider_id == current_user.id, Booking.driver_id == current_user.id),
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CANCELLED])
        )
        .order_by(Booking.created_at.desc())
        .limit(20)
    )
    trips = result.scalars().all()
    
    response = []
    for t in trips:
        payment = t.payments[0] if t.payments else None
        response.append({
            "booking_ref": t.booking_ref,
            "status": t.status.value,
            "pickup_address": t.pickup_address,
            "destination_address": t.destination_address,
            "actual_distance_km": t.actual_distance_km,
            "final_fare": t.final_fare,
            "created_at": t.created_at.isoformat(),
            "payment_method": payment.method.value if payment else None,
            "payment_status": payment.status.value if payment else None,
            "has_rated": any(r.rater_id == current_user.id for r in t.reviews)
        })
        
    return response

@router.post("/trips/{booking_ref}/rate")
async def rate_trip(
    booking_ref: str,
    request: ReviewSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify booking
    result = await db.execute(select(Booking).where(Booking.booking_ref == booking_ref))
    booking = result.scalars().first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only rate completed trips")
        
    # Determine ratee
    if str(booking.rider_id) == str(current_user.id):
        ratee_id = booking.driver_id
    elif str(booking.driver_id) == str(current_user.id):
        ratee_id = booking.rider_id
    else:
        raise HTTPException(status_code=403, detail="Not authorized to rate this trip")
        
    if not ratee_id:
        raise HTTPException(status_code=400, detail="No ratee available")
        
    rating_service = RatingService(db)
    success, msg = await rating_service.submit_review(
        booking_id=booking.id,
        rater_id=current_user.id,
        ratee_id=ratee_id,
        rating=request.rating,
        feedback_text=request.feedback_text,
        categories=request.categories,
        is_anonymous=request.is_anonymous
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=msg)
        
    return {"message": msg}
