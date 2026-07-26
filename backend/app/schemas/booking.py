from typing import Optional, List, Dict, Any
from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from app.models.booking import RideType, TripType, BookingStatus, VehicleCategory, CouponType

class FareEstimateBase(BaseModel):
    ride_type: RideType
    vehicle_category: VehicleCategory
    distance_km: float
    duration_min: float

class FareEstimateRequest(BaseModel):
    ride_type: RideType
    pickup_lat: float
    pickup_lon: float
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    is_round_trip: Optional[bool] = False


class FareEstimateResponse(FareEstimateBase):
    id: UUID4
    base_fare: float
    distance_fare: float
    duration_fare: float
    surge_multiplier: float
    surge_charge: float
    toll_charges: float
    night_charge: float
    driver_allowance: float
    state_tax: float
    coupon_discount: float
    total_fare: float
    breakdown: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class CouponValidateRequest(BaseModel):
    code: str
    ride_type: Optional[RideType] = None
    fare_amount: float

class CouponValidateResponse(BaseModel):
    valid: bool
    discount_amount: float
    message: Optional[str] = None

class BookingPreferenceSchema(BaseModel):
    preferred_language: Optional[str] = "en"
    air_conditioning: Optional[bool] = True
    pet_friendly: Optional[bool] = False
    wheelchair_accessible: Optional[bool] = False
    female_driver_preferred: Optional[bool] = False
    child_seat: Optional[bool] = False
    silent_ride: Optional[bool] = False
    music_preference: Optional[str] = None
    special_instructions: Optional[str] = None

class BookingCreateRequest(BaseModel):
    ride_type: RideType
    trip_type: Optional[TripType] = TripType.NOW
    vehicle_category: VehicleCategory
    pickup_lat: float
    pickup_lon: float
    pickup_address: str
    destination_lat: float
    destination_lon: float
    destination_address: str
    distance_km: Optional[float] = None
    duration_min: Optional[float] = None
    route_geometry: Optional[Dict[str, Any]] = None
    fare_estimate_id: Optional[UUID4] = None
    coupon_code: Optional[str] = None
    payment_method: Optional[str] = "CASH"
    scheduled_at: Optional[datetime] = None
    return_at: Optional[datetime] = None
    preferences: Optional[BookingPreferenceSchema] = None
    idempotency_key: Optional[str] = None
    fare_breakdown: Optional[Dict[str, Any]] = None

class BookingResponse(BaseModel):
    id: UUID4
    booking_ref: str
    rider_id: UUID4
    ride_type: RideType
    trip_type: TripType
    vehicle_category: VehicleCategory
    status: BookingStatus
    pickup_address: str
    destination_address: str
    payment_method: str
    created_at: datetime
    
    class Config:
        from_attributes = True
