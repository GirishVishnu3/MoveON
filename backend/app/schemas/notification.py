from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.models.notification import NotificationCategory, NotificationPriority, PlatformEnum

class NotificationResponse(BaseModel):
    id: str
    category: str
    title: str
    message: str
    priority: str
    is_read: bool
    metadata_data: Optional[Dict[str, Any]]
    created_at: str

class DeviceTokenRequest(BaseModel):
    token: str
    platform: PlatformEnum

class NotificationPreferenceResponse(BaseModel):
    category: str
    push_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    in_app_enabled: bool

class NotificationPreferenceUpdateRequest(BaseModel):
    category: NotificationCategory
    push_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    in_app_enabled: bool
