from pydantic import BaseModel, Field
from typing import Optional

class OtpRequestSchema(BaseModel):
    phone_number: str = Field(..., description="Phone number with country code")
    role: Optional[str] = Field("GUEST", description="Role of the user (RIDER, DRIVER, ADMIN)")

class FirebaseLoginSchema(BaseModel):
    id_token: str = Field(..., description="Firebase ID token")
    role: str = Field(..., description="Role of the user (RIDER, DRIVER, ADMIN)")
    device_info: Optional[str] = None
    
class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False

class RefreshTokenSchema(BaseModel):
    refresh_token: str
