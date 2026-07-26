from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DocumentUploadSchema(BaseModel):
    document_type: str = Field(..., example="DL")
    document_number: Optional[str] = None
    file_url: str = Field(..., example="https://example.com/dl.jpg")

class VehicleDetailsSchema(BaseModel):
    vehicle_number: str = Field(..., example="KA-03-HA-1234", max_length=50)
    make: str = Field(..., example="Maruti Suzuki", max_length=100)
    model: str = Field(..., example="Swift Dzire", max_length=100)
    year: int = Field(..., example=2018)
    category: str = Field(..., example="SEDAN", max_length=30)
    rc_number: str = Field(..., example="RC123456789", max_length=100)
    rc_url: str = Field(..., example="https://example.com/rc.jpg")
    insurance_url: str = Field(..., example="https://example.com/insurance.jpg")
    puc_url: Optional[str] = None

class BankDetailsSchema(BaseModel):
    account_number: str = Field(..., example="123456789012", max_length=50)
    ifsc_code: str = Field(..., example="SBIN0001234", max_length=20)
    account_holder_name: str = Field(..., example="Ramesh Kumar", max_length=150)
    bank_name: str = Field(..., example="State Bank of India", max_length=100)
    upi_id: Optional[str] = Field(None, example="ramesh@upi", max_length=100)

class SubscriptionSelectionSchema(BaseModel):
    plan_name: str = Field(..., example="PRO")  # BASIC, PRO, UNLIMITED

class OnboardingSubmitSchema(BaseModel):
    agreement_accepted: bool = Field(..., example=True)
    selfie_url: str = Field(..., example="https://example.com/selfie.jpg")
