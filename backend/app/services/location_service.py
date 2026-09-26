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
    async def resolve_city_from_coords(
        db: AsyncSession,
        lat: float,
        lon: float,
        country_code: Optional[str] = None
    ) -> Optional["City"]:
        """
        Resolves a lat/lon pair to a City record in the database.
        1. Checks geometric distance against registered cities (fast, reliable, offline-safe).
        2. If country_code (or UK coords) is provided, finds the nearest city in that country.
        3. Falls back to Nominatim reverse geocoding if needed.
        """
        try:
            # 1. Fetch active cities
            result = await db.execute(select(City).where(City.is_active == True))
            all_cities = result.scalars().all()

            best_city = None
            min_dist = float("inf")

            for c in all_cities:
                if c.lat_center is not None and c.lon_center is not None:
                    dist = LocationService._haversine(lat, lon, c.lat_center, c.lon_center)
                    radius = c.radius_km or 50.0
                    if dist <= radius and dist < min_dist:
                        min_dist = dist
                        best_city = c

            if best_city:
                return best_city

            # 2. Country-aware proximity fallback
            is_uk = (country_code == "GB") or (49.8 <= lat <= 60.9 and -8.6 <= lon <= 1.8)
            target_country = "United Kingdom" if is_uk else ("India" if country_code == "IN" else None)

            if target_country:
                country_cities = [c for c in all_cities if c.country == target_country and c.lat_center is not None]
                if country_cities:
                    best_country_city = min(
                        country_cities,
                        key=lambda c: LocationService._haversine(lat, lon, c.lat_center, c.lon_center)
                    )
                    return best_country_city

            # 3. Fallback: Nominatim reverse geocoding
            geo_result = await NominatimClient.reverse(lat, lon)
            if geo_result:
                address = geo_result.get("address", {})
                city_name = (
                    address.get("city") or
                    address.get("town") or
                    address.get("village") or
                    address.get("county") or
                    ""
                )
                if city_name:
                    res = await db.execute(
                        select(City).where(
                            City.name.ilike(f"%{city_name}%"),
                            City.is_active == True
                        ).limit(1)
                    )
                    return res.scalar_one_or_none()

            return None
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
