import httpx
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class NominatimClient:
    """Client for OpenStreetMap Nominatim API for geocoding."""
    BASE_URL = "https://nominatim.openstreetmap.org"
    HEADERS = {
        "User-Agent": "MoveON-RideHailing/1.0 (contact@moveon.example.com)"
    }

    @staticmethod
    async def search(query: str, limit: int = 5) -> List[Dict]:
        async with httpx.AsyncClient() as client:
            try:
                params = {
                    "q": query,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": limit
                }
                response = await client.get(
                    f"{NominatimClient.BASE_URL}/search",
                    params=params,
                    headers=NominatimClient.HEADERS,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Nominatim Search Error: {e}")
                return []

    @staticmethod
    async def reverse(lat: float, lon: float) -> Optional[Dict]:
        async with httpx.AsyncClient() as client:
            try:
                params = {
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "addressdetails": 1
                }
                response = await client.get(
                    f"{NominatimClient.BASE_URL}/reverse",
                    params=params,
                    headers=NominatimClient.HEADERS,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Nominatim Reverse Error: {e}")
                return None

class OSRMClient:
    """Client for OSRM API for routing and distance calculation."""
    BASE_URL = "https://router.project-osrm.org"

    @staticmethod
    async def get_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict]:
        async with httpx.AsyncClient() as client:
            try:
                # OSRM expects lon,lat
                coordinates = f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
                url = f"{OSRMClient.BASE_URL}/route/v1/driving/{coordinates}?overview=full&geometries=geojson"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                    route = data["routes"][0]
                    return {
                        "distance_meters": route.get("distance"),
                        "duration_seconds": route.get("duration"),
                        "geometry": route.get("geometry")
                    }
                return None
            except Exception as e:
                logger.error(f"OSRM Route Error: {e}")
                return None
