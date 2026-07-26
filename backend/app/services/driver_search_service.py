from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.driver import DriverRepository
import math

class DriverSearchService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DriverRepository(session)

    async def search_nearby_drivers(self, lat: float, lon: float, vehicle_category: str, initial_radius: float = 3.0, max_radius: float = 15.0):
        current_radius = initial_radius
        drivers = []
        while current_radius <= max_radius:
            drivers = await self.repo.find_nearby_drivers(lat, lon, current_radius, vehicle_category)
            if drivers:
                break
            current_radius += 2.0  # Expand by 2km each attempt
        
        return drivers

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
