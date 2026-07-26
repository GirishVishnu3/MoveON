from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class DriverBasicInfoRegisterSchema(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., min_length=10, max_length=20)
    email: str = Field(..., min_length=5, max_length=150)
    dob: str = Field(..., example="1995-08-15")
    gender: str = Field(..., example="MALE")
    profile_photo_url: Optional[str] = None
    preferred_language: str = Field(default="en")

    # Emergency contact
    emergency_contact_name: str = Field(..., min_length=1)
    emergency_contact_phone: str = Field(..., min_length=10)
    emergency_contact_relationship: str = Field(..., min_length=1)

    # Residential Address
    street_address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    pincode: str = Field(..., min_length=5, max_length=10)
    landmark: Optional[str] = None

    # Password for future login support
    password: str = Field(..., min_length=6)

class DriverOtpVerifySchema(BaseModel):
    phone_number: str
    otp_code: str
    device_info: Optional[str] = None

class DriverLoginSchema(BaseModel):
    phone_number: str
    password: Optional[str] = None
    otp_code: Optional[str] = None
    device_info: Optional[str] = None

class DriverDraftSchema(BaseModel):
    phone_number: str
    draft_data: dict

class DriverProfileResponseSchema(BaseModel):
    dob: Optional[str] = None
    gender: Optional[str] = None
    profile_photo_url: Optional[str] = None
    preferred_language: str = "en"

class DriverAddressResponseSchema(BaseModel):
    street_address: str
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None

class EmergencyContactResponseSchema(BaseModel):
    name: str
    phone_number: str
    contact_relationship: str

class DriverResponseSchema(BaseModel):
    id: Any
    driver_id_code: str
    first_name: str
    last_name: str
    phone_number: str
    email: str
    account_status: str
    verification_status: str
    onboarding_status: str
    online_status: str
    wallet_balance: float
    rating: float
    completed_rides: int
    cancellation_count: int
    acceptance_rate: float
    earnings: float
    profile: Optional[DriverProfileResponseSchema] = None
    address: Optional[DriverAddressResponseSchema] = None
    emergency_contact: Optional[EmergencyContactResponseSchema] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DriverTokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    driver: DriverResponseSchema
