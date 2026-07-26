import math
from typing import List, Dict, Optional
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.integrations.maps import NominatimClient, OSRMClient
from app.models.pricing import City
# In a real app we'd inject a Redis cache client here. For simplicity, we use an in-memory dict for demonstration,
# but it should be replaced with `await redis.get/set` in production.
_cache = {}

class LocationService:
    
    @staticmethod
    async def search_places(query: str, limit: int = 5) -> List[Dict]:
        cache_key = f"search:{query}:{limit}"
        if cache_key in _cache:
            return _cache[cache_key]
            
        results = await NominatimClient.search(query, limit)
        _cache[cache_key] = results
        return results

    @staticmethod
    async def reverse_geocode(lat: float, lon: float) -> Optional[Dict]:
        cache_key = f"reverse:{lat},{lon}"
        if cache_key in _cache:
            return _cache[cache_key]
            
        result = await NominatimClient.reverse(lat, lon)
        if result:
            _cache[cache_key] = result
        return result

    @staticmethod
    async def get_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict]:
        # Caching route could be tricky if coordinates slightly change, but we can round to 4 decimals for caching
        rnd_olat, rnd_olon = round(origin_lat, 4), round(origin_lon, 4)
        rnd_dlat, rnd_dlon = round(dest_lat, 4), round(dest_lon, 4)
        
        cache_key = f"route:{rnd_olat},{rnd_olon}:{rnd_dlat},{rnd_dlon}"
        if cache_key in _cache:
            return _cache[cache_key]
            
        result = await OSRMClient.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
        if result:
            _cache[cache_key] = result
        return result

    @staticmethod
    async def resolve_city_from_coords(db: AsyncSession, lat: float, lon: float) -> Optional["City"]:
        """
        Resolves a lat/lon pair to a City record in the database.
        Uses Nominatim reverse geocoding to get the city name, then 
        performs a case-insensitive DB lookup. Falls back to None (global rules apply).
        """
        try:
            geo_result = await NominatimClient.reverse(lat, lon)
            if not geo_result:
                return None
            # Nominatim returns address with 'city', 'town', 'village' fields
            address = geo_result.get("address", {})
            city_name = (
                address.get("city") or
                address.get("town") or
                address.get("village") or
                address.get("county") or
                ""
            )
            if not city_name:
                return None
            result = await db.execute(
                select(City).where(
                    City.name.ilike(f"%{city_name}%"),
                    City.is_active == True
                ).limit(1)
            )
            return result.scalar_one_or_none()
        except Exception:
            await db.rollback()
            return None

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
