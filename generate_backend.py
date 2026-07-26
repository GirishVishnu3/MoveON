import os

base_dir = "/Users/girishvishnu/Desktop/MoveON/backend/app"
os.makedirs(os.path.join(base_dir, "schemas"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "repositories"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "services"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "routers"), exist_ok=True)

schema_code = """from typing import Optional, List, Dict, Any
from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from app.models.booking import RideType, TripType, BookingStatus, VehicleCategory, CouponType

class FareEstimateBase(BaseModel):
    ride_type: RideType
    vehicle_category: VehicleCategory
    distance_km: float
    duration_min: float

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
        orm_mode = True

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
        orm_mode = True
"""

repository_code = """from sqlalchemy.orm import Session
from app.models.booking import Booking, FareEstimate, Coupon, BookingPreference, BookingStatusHistory, BookingStatus
from typing import Optional, List
import uuid

class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_booking(self, booking_data: dict) -> Booking:
        booking = Booking(**booking_data)
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)
        
        # Add initial status history
        history = BookingStatusHistory(
            booking_id=booking.id,
            new_status=booking.status,
            reason="Booking created"
        )
        self.db.add(history)
        self.db.commit()
        
        return booking

    def get_booking_by_ref(self, booking_ref: str) -> Optional[Booking]:
        return self.db.query(Booking).filter(Booking.booking_ref == booking_ref).first()

    def update_booking_status(self, booking_id: uuid.UUID, new_status: BookingStatus, reason: str = None) -> Booking:
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        if booking:
            old_status = booking.status
            booking.status = new_status
            
            history = BookingStatusHistory(
                booking_id=booking.id,
                old_status=old_status,
                new_status=new_status,
                reason=reason
            )
            self.db.add(history)
            self.db.commit()
            self.db.refresh(booking)
        return booking

    def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        return self.db.query(Coupon).filter(Coupon.code == code, Coupon.is_active == True).first()

    def create_fare_estimate(self, estimate_data: dict) -> FareEstimate:
        estimate = FareEstimate(**estimate_data)
        self.db.add(estimate)
        self.db.commit()
        self.db.refresh(estimate)
        return estimate
        
    def create_preferences(self, pref_data: dict) -> BookingPreference:
        pref = BookingPreference(**pref_data)
        self.db.add(pref)
        self.db.commit()
        self.db.refresh(pref)
        return pref
"""

fare_service_code = """from app.models.booking import RideType, VehicleCategory
from typing import Dict, Any

class FareService:
    @staticmethod
    def calculate_fare(ride_type: RideType, vehicle_category: VehicleCategory, distance_km: float, duration_min: float, is_night: bool = False) -> Dict[str, Any]:
        # Mock logic based on vehicle and ride type
        base_rate = 50.0
        per_km = 12.0
        
        if ride_type == RideType.INTERCITY:
            per_km = 10.0
            base_rate = 200.0
            
        if vehicle_category in [VehicleCategory.SUV, VehicleCategory.XL_SUV]:
            per_km *= 1.5
            base_rate *= 1.5
            
        distance_fare = distance_km * per_km
        duration_fare = duration_min * 1.5
        
        total = base_rate + distance_fare + duration_fare
        
        return {
            "base_fare": base_rate,
            "distance_fare": distance_fare,
            "duration_fare": duration_fare,
            "surge_multiplier": 1.0,
            "surge_charge": 0.0,
            "toll_charges": 0.0,
            "night_charge": 0.0,
            "driver_allowance": 0.0,
            "state_tax": total * 0.05,
            "coupon_discount": 0.0,
            "total_fare": total + (total * 0.05),
            "breakdown": {
                "base": base_rate,
                "distance": distance_fare,
                "duration": duration_fare
            }
        }
"""

vehicle_service_code = """from app.models.booking import RideType, VehicleCategory
from typing import List

class VehicleService:
    @staticmethod
    def get_available_vehicles(ride_type: RideType, lat: float, lon: float) -> List[dict]:
        # Return mock vehicle data for now
        return [
            {"category": VehicleCategory.HATCHBACK, "display_name": "Mini", "eta_min": 5},
            {"category": VehicleCategory.SEDAN, "display_name": "Sedan", "eta_min": 8},
            {"category": VehicleCategory.SUV, "display_name": "SUV", "eta_min": 12},
        ]
"""

coupon_service_code = """from app.models.booking import Coupon, CouponType
from typing import Tuple, Optional

class CouponService:
    @staticmethod
    def validate_coupon(coupon: Optional[Coupon], fare_amount: float) -> Tuple[bool, float, str]:
        if not coupon:
            return False, 0.0, "Invalid coupon code"
            
        if coupon.min_fare > fare_amount:
            return False, 0.0, f"Minimum fare requirement not met (min: {coupon.min_fare})"
            
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return False, 0.0, "Coupon usage limit reached"
            
        discount = 0.0
        if coupon.coupon_type == CouponType.FIXED:
            discount = coupon.value
        elif coupon.coupon_type == CouponType.PERCENTAGE:
            discount = fare_amount * (coupon.value / 100.0)
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
                
        return True, discount, "Coupon applied successfully"
"""

booking_service_code = """from app.repositories.booking import BookingRepository
from app.models.booking import BookingStatus
import uuid
import random
import string

class BookingService:
    def __init__(self, repo: BookingRepository):
        self.repo = repo

    def generate_booking_ref(self) -> str:
        return "BKG-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    def create_booking(self, user_id: uuid.UUID, data: dict, preferences_id: uuid.UUID = None) -> dict:
        booking_data = {
            "booking_ref": self.generate_booking_ref(),
            "rider_id": user_id,
            "ride_type": data["ride_type"],
            "trip_type": data.get("trip_type"),
            "vehicle_category": data["vehicle_category"],
            "pickup_lat": data["pickup_lat"],
            "pickup_lon": data["pickup_lon"],
            "pickup_address": data["pickup_address"],
            "destination_lat": data["destination_lat"],
            "destination_lon": data["destination_lon"],
            "destination_address": data["destination_address"],
            "distance_km": data.get("distance_km"),
            "duration_min": data.get("duration_min"),
            "route_geometry": data.get("route_geometry"),
            "fare_estimate_id": data.get("fare_estimate_id"),
            "coupon_code": data.get("coupon_code"),
            "payment_method": data.get("payment_method", "CASH"),
            "scheduled_at": data.get("scheduled_at"),
            "return_at": data.get("return_at"),
            "preferences_id": preferences_id,
            "idempotency_key": data.get("idempotency_key"),
            "status": BookingStatus.SEARCHING
        }
        return self.repo.create_booking(booking_data)
"""

schedule_service_code = """from datetime import datetime
class ScheduleService:
    @staticmethod
    def validate_schedule(scheduled_at: datetime) -> bool:
        if scheduled_at < datetime.utcnow():
            return False
        return True
"""

router_code = """from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.dependencies import get_db
from app.authentication.dependencies import get_current_user
from app.schemas.booking import (
    BookingCreateRequest, BookingResponse, FareEstimateResponse,
    CouponValidateRequest, CouponValidateResponse
)
from app.repositories.booking import BookingRepository
from app.services.fare_service import FareService
from app.services.vehicle_service import VehicleService
from app.services.coupon_service import CouponService
from app.services.booking_service import BookingService
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/booking", tags=["Booking"])

@router.post("/estimate")
def estimate_fare(request: BookingCreateRequest, db: Session = Depends(get_db)):
    # Calculate mock fare based on request
    fare_details = FareService.calculate_fare(
        ride_type=request.ride_type,
        vehicle_category=request.vehicle_category,
        distance_km=request.distance_km or 10.0,
        duration_min=request.duration_min or 30.0
    )
    
    # Save fare estimate
    repo = BookingRepository(db)
    fare_details.update({
        "ride_type": request.ride_type,
        "vehicle_category": request.vehicle_category,
        "distance_km": request.distance_km or 10.0,
        "duration_min": request.duration_min or 30.0
    })
    estimate = repo.create_fare_estimate(fare_details)
    
    # Return available vehicles as well (not matching schema perfectly, but a standard flow)
    vehicles = VehicleService.get_available_vehicles(request.ride_type, request.pickup_lat, request.pickup_lon)
    
    return {"estimate": estimate, "vehicles": vehicles}

@router.post("/coupon/validate", response_model=CouponValidateResponse)
def validate_coupon(request: CouponValidateRequest, db: Session = Depends(get_db)):
    repo = BookingRepository(db)
    coupon = repo.get_coupon_by_code(request.code)
    
    valid, discount, message = CouponService.validate_coupon(coupon, request.fare_amount)
    return {"valid": valid, "discount_amount": discount, "message": message}

@router.post("/confirm", response_model=BookingResponse)
def confirm_booking(request: BookingCreateRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if request.scheduled_at and not ScheduleService.validate_schedule(request.scheduled_at):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
    repo = BookingRepository(db)
    service = BookingService(repo)
    
    pref_id = None
    if request.preferences:
        pref = repo.create_preferences(request.preferences.dict())
        pref_id = pref.id
        
    booking = service.create_booking(current_user.id, request.dict(), pref_id)
    return booking

@router.get("/{booking_ref}", response_model=BookingResponse)
def get_booking(booking_ref: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    repo = BookingRepository(db)
    booking = repo.get_booking_by_ref(booking_ref)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.rider_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return booking
"""

with open(os.path.join(base_dir, "schemas", "booking.py"), "w") as f: f.write(schema_code)
with open(os.path.join(base_dir, "repositories", "__init__.py"), "w") as f: pass
with open(os.path.join(base_dir, "repositories", "booking.py"), "w") as f: f.write(repository_code)
with open(os.path.join(base_dir, "services", "fare_service.py"), "w") as f: f.write(fare_service_code)
with open(os.path.join(base_dir, "services", "vehicle_service.py"), "w") as f: f.write(vehicle_service_code)
with open(os.path.join(base_dir, "services", "coupon_service.py"), "w") as f: f.write(coupon_service_code)
with open(os.path.join(base_dir, "services", "booking_service.py"), "w") as f: f.write(booking_service_code)
with open(os.path.join(base_dir, "services", "schedule_service.py"), "w") as f: f.write(schedule_service_code)
with open(os.path.join(base_dir, "routers", "booking.py"), "w") as f: f.write(router_code)

print("Backend files generated successfully.")
