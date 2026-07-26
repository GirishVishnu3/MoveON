import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base

class NotificationCategory(str, enum.Enum):
    BOOKING_UPDATE = "BOOKING_UPDATE"
    DRIVER_ASSIGNMENT = "DRIVER_ASSIGNMENT"
    TRIP_PROGRESS = "TRIP_PROGRESS"
    PAYMENT_EVENT = "PAYMENT_EVENT"
    WALLET_EVENT = "WALLET_EVENT"
    PROMOTIONAL = "PROMOTIONAL"
    RATING_REVIEW = "RATING_REVIEW"
    SYSTEM = "SYSTEM"
    EMERGENCY = "EMERGENCY"

class NotificationPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class PlatformEnum(str, enum.Enum):
    IOS = "IOS"
    ANDROID = "ANDROID"
    WEB = "WEB"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Optional sender
    
    category = Column(SAEnum(NotificationCategory), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(String(1000), nullable=False)
    priority = Column(SAEnum(NotificationPriority), default=NotificationPriority.NORMAL)
    
    is_read = Column(Boolean, default=False, index=True)
    metadata_data = Column(JSON, nullable=True) # deep links, custom data
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)

class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    token = Column(String, nullable=False, unique=True)
    platform = Column(SAEnum(PlatformEnum), nullable=False)
    
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    category = Column(SAEnum(NotificationCategory), nullable=False)
    
    push_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True) # Hard to opt out of in-app generally, but possible
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
