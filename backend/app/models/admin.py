import uuid
import enum
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class AdminRoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OPERATIONS_MANAGER = "OPERATIONS_MANAGER"
    SUPPORT_EXECUTIVE = "SUPPORT_EXECUTIVE"
    FINANCE_MANAGER = "FINANCE_MANAGER"
    FLEET_MANAGER = "FLEET_MANAGER"
    ANALYTICS_VIEWER = "ANALYTICS_VIEWER"

class AdminProfile(Base):
    __tablename__ = "admin_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    admin_role = Column(SAEnum(AdminRoleEnum), nullable=False)
    
    # Specific granular permissions (e.g., "manage_users", "view_financials")
    # Using Postgres ARRAY of Strings or JSON for flexibility
    permissions = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
