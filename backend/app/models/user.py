import enum
import uuid
from sqlalchemy import Column, String, Enum, DateTime, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class RoleEnum(str, enum.Enum):
    RIDER = "RIDER"
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"

class UserStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint('email', 'role', name='uq_user_email_role'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(Enum(RoleEnum), nullable=False)
    phone_number = Column(String, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    language = Column(String, default="en")
    status = Column(Enum(UserStatusEnum), default=UserStatusEnum.ACTIVE)
    
    # Audit timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
