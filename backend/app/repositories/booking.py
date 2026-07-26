from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.booking import Booking, FareEstimate, Coupon, BookingPreference, BookingStatusHistory, BookingStatus
from typing import Optional
import uuid

class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_booking(self, booking_data: dict) -> Booking:
        booking = Booking(**booking_data)
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        
        # Add initial status history
        history = BookingStatusHistory(
            booking_id=booking.id,
            new_status=booking.status,
            reason="Booking created"
        )
        self.db.add(history)
        await self.db.commit()
        
        return booking

    async def get_booking_by_ref(self, booking_ref: str) -> Optional[Booking]:
        result = await self.db.execute(select(Booking).where(Booking.booking_ref == booking_ref))
        return result.scalars().first()

    async def update_booking_status(self, booking_id: uuid.UUID, new_status: BookingStatus, reason: str = None) -> Booking:
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalars().first()
        if booking:
            old_status = booking.status
            booking.status = new_status
            
            history = BookingStatusHistory(
                booking_id=booking.id,
                old_status=old_status,
                new_status=new_status,
                reason=reason
            )
            self.db.add(history)
            await self.db.commit()
            await self.db.refresh(booking)
        return booking

    async def update_booking_status_by_ref(self, booking_ref: str, new_status: BookingStatus, reason: str = None) -> Optional[Booking]:
        result = await self.db.execute(select(Booking).where(Booking.booking_ref == booking_ref))
        booking = result.scalars().first()
        if booking:
            return await self.update_booking_status(booking.id, new_status, reason)
        return None

    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        result = await self.db.execute(select(Coupon).where(Coupon.code == code, Coupon.is_active == True))
        return result.scalars().first()

    async def create_fare_estimate(self, estimate_data: dict) -> FareEstimate:
        estimate = FareEstimate(**estimate_data)
        self.db.add(estimate)
        await self.db.commit()
        await self.db.refresh(estimate)
        return estimate
        
    async def create_preferences(self, pref_data: dict) -> BookingPreference:
        pref = BookingPreference(**pref_data)
        self.db.add(pref)
        await self.db.commit()
        await self.db.refresh(pref)
        return pref
