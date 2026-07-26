import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database.database import Base


class LocationHistory(Base):
    __tablename__ = "location_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    driver_id = Column(String(50), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    speed = Column(Float, nullable=True)     # Speed in m/s
    heading = Column(Float, nullable=True)   # Heading in degrees (0-360)
    accuracy = Column(Float, nullable=True)  # Accuracy in meters
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Index for quickly querying location history for a specific booking and driver
    __table_args__ = (
        Index('idx_booking_recorded', 'booking_id', 'recorded_at'),
    )
