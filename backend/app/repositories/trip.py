from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from typing import List, Optional
import uuid
from app.models.trip import LocationHistory


class TripRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_location(self, location_data: dict) -> LocationHistory:
        loc = LocationHistory(**location_data)
        self.db.add(loc)
        await self.db.commit()
        await self.db.refresh(loc)
        return loc

    async def get_recent_locations(self, booking_id: uuid.UUID, limit: int = 50) -> List[LocationHistory]:
        result = await self.db.execute(
            select(LocationHistory)
            .where(LocationHistory.booking_id == booking_id)
            .order_by(desc(LocationHistory.recorded_at))
            .limit(limit)
        )
        return result.scalars().all()
