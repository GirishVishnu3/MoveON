from pydantic import BaseModel, Field
from typing import Optional

class PhoneOtpRequestSchema(BaseModel):
    phone_number: str = Field(..., description="User's phone number")
    role: Optional[str] = Field("RIDER", description="Role of the user (RIDER, DRIVER, ADMIN)")

class PhoneOtpVerifySchema(BaseModel):
    phone_number: str = Field(..., description="User's phone number")
    otp: str = Field(..., description="6-digit OTP code")
    role: str = Field(..., description="Role of the user (RIDER, DRIVER, ADMIN)")
    full_name: Optional[str] = Field(None, description="Full name for account creation")
    device_info: Optional[str] = None
    
class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False

class RefreshTokenSchema(BaseModel):
    refresh_token: str
