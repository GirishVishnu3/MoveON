import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Enum as SAEnum,
    ForeignKey, DateTime, Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.models.payment import Payment, Invoice
from app.models.rating import Review


class RideType(str, enum.Enum):
    INTERCITY = "INTERCITY"
    INTRACITY = "INTRACITY"


class TripType(str, enum.Enum):
    NOW = "NOW"
    SCHEDULED = "SCHEDULED"
    ROUND_TRIP = "ROUND_TRIP"


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    SEARCHING = "SEARCHING"
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED"
    DRIVER_EN_ROUTE = "DRIVER_EN_ROUTE"
    DRIVER_ARRIVED = "DRIVER_ARRIVED"
    PASSENGER_ONBOARDED = "PASSENGER_ONBOARDED"
    TRIP_STARTED = "TRIP_STARTED"
    TRIP_IN_PROGRESS = "TRIP_IN_PROGRESS"
    STOP_ADDED = "STOP_ADDED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"
    SOS_ACTIVE = "SOS_ACTIVE"


class VehicleCategory(str, enum.Enum):
    BIKE = "BIKE"
    SCOOTER = "SCOOTER"
    AUTO_RICKSHAW = "AUTO_RICKSHAW"
    HATCHBACK = "HATCHBACK"
    SEDAN = "SEDAN"
    SUV = "SUV"
    XL_SUV = "XL_SUV"
    PREMIUM_SEDAN = "PREMIUM_SEDAN"
    LUXURY = "LUXURY"
    ELECTRIC = "ELECTRIC"
    SHARED = "SHARED"
    RENTAL = "RENTAL"
    OUTSTATION_CAB = "OUTSTATION_CAB"


class CouponType(str, enum.Enum):
    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255))
    coupon_type = Column(SAEnum(CouponType), nullable=False)
    value = Column(Float, nullable=False)           # amount or percentage
    max_discount = Column(Float, nullable=True)      # cap for percentage coupons
    min_fare = Column(Float, default=0.0)            # minimum fare to apply
    usage_limit = Column(Integer, nullable=True)     # None = unlimited
    used_count = Column(Integer, default=0)
    ride_type = Column(SAEnum(RideType), nullable=True)  # None = both
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BookingPreference(Base):
    __tablename__ = "booking_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    preferred_language = Column(String(10), default="en")
    air_conditioning = Column(Boolean, default=True)
    pet_friendly = Column(Boolean, default=False)
    wheelchair_accessible = Column(Boolean, default=False)
    female_driver_preferred = Column(Boolean, default=False)
    child_seat = Column(Boolean, default=False)
    silent_ride = Column(Boolean, default=False)
    music_preference = Column(String(50), nullable=True)
    special_instructions = Column(Text, nullable=True)


class FareEstimate(Base):
    __tablename__ = "fare_estimates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_type = Column(SAEnum(RideType), nullable=False)
    vehicle_category = Column(SAEnum(VehicleCategory), nullable=False)
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Float, nullable=False)
    base_fare = Column(Float, default=0.0)
    distance_fare = Column(Float, default=0.0)
    duration_fare = Column(Float, default=0.0)
    surge_multiplier = Column(Float, default=1.0)
    surge_charge = Column(Float, default=0.0)
    toll_charges = Column(Float, default=0.0)
    night_charge = Column(Float, default=0.0)
    driver_allowance = Column(Float, default=0.0)
    state_tax = Column(Float, default=0.0)
    coupon_discount = Column(Float, default=0.0)
    total_fare = Column(Float, nullable=False)
    breakdown = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_ref = Column(String(20), unique=True, nullable=False, index=True)
    rider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), nullable=True) # Assuming driver might be linked later or referenced
    ride_type = Column(SAEnum(RideType), nullable=False)
    trip_type = Column(SAEnum(TripType), default=TripType.NOW)
    vehicle_category = Column(SAEnum(VehicleCategory), nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.SEARCHING, nullable=False)

    # Locations
    pickup_lat = Column(Float, nullable=False)
    pickup_lon = Column(Float, nullable=False)
    pickup_address = Column(String(500), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lon = Column(Float, nullable=False)
    destination_address = Column(String(500), nullable=False)

    # Route
    distance_km = Column(Float, nullable=True) # Estimated distance
    duration_min = Column(Float, nullable=True) # Estimated duration
    route_geometry = Column(JSON, nullable=True)

    # Actual Trip Metrics
    actual_distance_km = Column(Float, nullable=True)
    actual_duration_min = Column(Float, nullable=True)
    final_fare = Column(Float, nullable=True)

    # Fare
    fare_estimate_id          = Column(UUID(as_uuid=True), ForeignKey("fare_estimates.id"), nullable=True)
    pricing_rule_version_id   = Column(UUID(as_uuid=True), nullable=True)  # References pricing_rule_versions.id — stored as plain UUID to avoid circular import
    coupon_code               = Column(String(50), nullable=True)
    payment_method = Column(String(30), default="CASH")

    # Schedule
    scheduled_at = Column(DateTime, nullable=True)
    return_at = Column(DateTime, nullable=True)

    # Relations
    preferences_id = Column(UUID(as_uuid=True), ForeignKey("booking_preferences.id"), nullable=True)

    # Meta
    idempotency_key = Column(String(100), unique=True, nullable=True)
    cancellation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fare = relationship("FareEstimate", foreign_keys=[fare_estimate_id])
    preferences = relationship("BookingPreference", foreign_keys=[preferences_id])
    status_history = relationship("BookingStatusHistory", back_populates="booking")
    payments = relationship("Payment", back_populates="booking")
    invoice = relationship("Invoice", back_populates="booking", uselist=False)
    reviews = relationship("Review", back_populates="booking")


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    old_status = Column(SAEnum(BookingStatus), nullable=True)
    new_status = Column(SAEnum(BookingStatus), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(String(50), default="system")
    reason = Column(String(255), nullable=True)

    booking = relationship("Booking", back_populates="status_history")
