from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.driver import DriverRepository

class DriverAvailabilityService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DriverRepository(session)

    async def update_status(self, driver_id: str, is_online: bool, vehicle_category: str = None, lat: float = None, lon: float = None):
        workload = "IDLE" if is_online else "OFFLINE"
        return await self.repo.upsert_driver_status(
            driver_id=driver_id, 
            is_online=is_online, 
            current_workload=workload,
            vehicle_category=vehicle_category,
            lat=lat,
            lon=lon
        )

    async def update_location(self, driver_id: str, lat: float, lon: float):
        return await self.repo.upsert_driver_status(
            driver_id=driver_id, 
            lat=lat, 
            lon=lon
        )

    async def get_status(self, driver_id: str):
        return await self.repo.get_driver_status(driver_id)
