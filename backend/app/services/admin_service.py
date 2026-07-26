import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.user import User, RoleEnum
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment

class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_metrics(self) -> dict:
        # Riders and Drivers count
        total_riders = await self.db.scalar(select(func.count(User.id)).where(User.role == RoleEnum.RIDER))
        total_drivers = await self.db.scalar(select(func.count(User.id)).where(User.role == RoleEnum.DRIVER))
        
        # Bookings count by status
        active_rides = await self.db.scalar(select(func.count(Booking.id)).where(Booking.status.in_([BookingStatus.DRIVER_ASSIGNED, BookingStatus.DRIVER_EN_ROUTE, BookingStatus.TRIP_IN_PROGRESS])))
        completed_rides = await self.db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.COMPLETED))
        
        # Revenue total
        total_revenue = await self.db.scalar(select(func.sum(Payment.amount)).where(Payment.status == "SUCCESS")) or 0.0

        return {
            "total_riders": total_riders,
            "total_drivers": total_drivers,
            "active_rides": active_rides,
            "completed_rides": completed_rides,
            "total_revenue": float(total_revenue)
        }

    async def get_users(self, role: RoleEnum, limit: int = 50, offset: int = 0):
        result = await self.db.execute(select(User).where(User.role == role).limit(limit).offset(offset))
        return result.scalars().all()
