import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    
    rater_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ratee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    rating = Column(Integer, nullable=False) # 1-5
    feedback_text = Column(Text, nullable=True)
    categories = Column(JSON, nullable=True) # e.g. ["cleanliness", "driving", "behavior"]
    
    is_anonymous = Column(Boolean, default=False)
    is_reported = Column(Boolean, default=False) # For inappropriate review reporting
    
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="reviews")
