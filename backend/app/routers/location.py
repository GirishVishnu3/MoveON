from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.services.location_service import LocationService

router = APIRouter(prefix="/location", tags=["Location"])

@router.get("/search")
async def search_locations(q: str, limit: int = 5):
    """Search for locations using OpenStreetMap Nominatim."""
    if not q or len(q) < 2:
        return []
    results = await LocationService.search_places(q, limit)
    return results

@router.get("/reverse")
async def reverse_geocode(lat: float, lon: float):
    """Reverse geocode coordinates to an address."""
    result = await LocationService.reverse_geocode(lat, lon)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result

@router.get("/route")
async def get_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float):
    """Calculate distance, duration and route geometry."""
    result = await LocationService.get_route(origin_lat, origin_lon, dest_lat, dest_lon)
    if not result:
        raise HTTPException(status_code=404, detail="Route not found")
    return result
