from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AdminMetricsResponse(BaseModel):
    total_riders: int
    total_drivers: int
    active_rides: int
    completed_rides: int
    total_revenue: float

class AdminUserResponse(BaseModel):
    id: str
    role: str
    phone_number: str
    full_name: Optional[str]
    email: Optional[str]
    status: str
    created_at: str

class UserStatusUpdateRequest(BaseModel):
    status: str

class SupportTicketResponse(BaseModel):
    id: str
    user_id: str
    subject: str
    status: str
    priority: str
    created_at: str
    
class AuditLogResponse(BaseModel):
    id: str
    admin_id: str
    action_type: str
    target_entity: str
    target_id: str
    outcome: str
    timestamp: str
