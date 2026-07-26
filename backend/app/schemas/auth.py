from pydantic import BaseModel, Field
from typing import Optional

class OtpRequestSchema(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")
    role: Optional[str] = Field("GUEST", description="Role of the user (RIDER, DRIVER, ADMIN)")

class OtpVerifySchema(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    role: str = Field(..., description="Role of the user (RIDER, DRIVER, ADMIN)")
    device_info: Optional[str] = None
    
class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False

class RefreshTokenSchema(BaseModel):
    refresh_token: str
