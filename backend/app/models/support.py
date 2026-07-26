import uuid
import enum
from sqlalchemy import Column, String, Enum as SAEnum, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.database import Base

class TicketStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class TicketPriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    assigned_admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    booking_ref = Column(String(100), nullable=True, index=True) # Optional link to a specific booking

    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    status = Column(SAEnum(TicketStatusEnum), default=TicketStatusEnum.OPEN, index=True)
    priority = Column(SAEnum(TicketPriorityEnum), default=TicketPriorityEnum.MEDIUM)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    message = Column(Text, nullable=False)
    is_internal_note = Column(String, default="false") # "true" if only visible to admins
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
