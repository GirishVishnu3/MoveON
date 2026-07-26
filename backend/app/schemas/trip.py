from pydantic import BaseModel, Field
from typing import Optional
from app.models.booking import BookingStatus

class TripStatusUpdateRequest(BaseModel):
    status: BookingStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TripLocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None

class TripTimelineResponse(BaseModel):
    booking_ref: str
    events: list[dict]

class FinalFareRequest(BaseModel):
    actual_distance_km: float
    actual_duration_min: float
    toll_charges: float = 0.0
    parking_charges: float = 0.0
