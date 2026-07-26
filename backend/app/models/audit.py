import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    action_type = Column(String(100), nullable=False, index=True) # e.g. "USER_SUSPEND", "REFUND_ISSUE"
    target_entity = Column(String(50), nullable=False) # e.g. "USER", "PAYMENT"
    target_id = Column(String(100), nullable=False) # e.g. UUID of the user/payment
    
    previous_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    ip_address = Column(String(50), nullable=True)
    device_info = Column(String, nullable=True)
    outcome = Column(String(20), nullable=False, default="SUCCESS") # SUCCESS / FAILED
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
