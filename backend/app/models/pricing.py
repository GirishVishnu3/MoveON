"""
MoveON Enterprise Pricing Models
All pricing is 100% database-driven. Zero hardcoded values.
Every model uses immutable versioning — never overwrite, always create new.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text,
    Enum as SAEnum, ForeignKey, DateTime, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.models.booking import RideType, VehicleCategory


# ─── City Registry ────────────────────────────────────────────────────────────

class City(Base):
    """Geographic pricing zone. Pricing rules reference City IDs, not names."""
    __tablename__ = "cities"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name         = Column(String(100), nullable=False, unique=True, index=True)
    state        = Column(String(100), nullable=True)
    country      = Column(String(100), nullable=False, default="India")
    timezone     = Column(String(50),  nullable=False, default="Asia/Kolkata")
    currency     = Column(String(10),  nullable=False, default="INR")
    # Approximate center coordinates for quick distance-based city matching
    lat_center   = Column(Float, nullable=True)
    lon_center   = Column(Float, nullable=True)
    radius_km    = Column(Float, nullable=False, default=50.0)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<City {self.name}>"


# ─── Vehicle Base Rate ────────────────────────────────────────────────────────

class VehicleBaseRate(Base):
    """
    Complete per-vehicle, per-ride-type, optionally per-city base rate.
    This is the primary source of truth for all base fare components.
    Never updated — create a new row and activate it instead.
    """
    __tablename__ = "vehicle_base_rates"

    id                        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                      = Column(String(150), nullable=False)   # e.g. "Hatchback IntraCity Bangalore v2"
    city_id                   = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)  # NULL = global
    ride_type                 = Column(SAEnum(RideType),        nullable=False)
    vehicle_category          = Column(SAEnum(VehicleCategory), nullable=False)

    # Core fare components
    base_fare                 = Column(Float, nullable=False, default=0.0)
    minimum_fare              = Column(Float, nullable=False, default=0.0)
    per_km_rate               = Column(Float, nullable=False, default=0.0)
    per_min_rate              = Column(Float, nullable=False, default=0.0)

    # Waiting
    waiting_charge_per_min    = Column(Float, nullable=False, default=0.0)
    free_waiting_min          = Column(Integer, nullable=False, default=5)

    # Cancellation
    cancellation_fee          = Column(Float, nullable=False, default=0.0)
    free_cancellation_min     = Column(Integer, nullable=False, default=5)  # grace before charge

    # Capacity
    max_passengers            = Column(Integer, nullable=False, default=4)
    max_luggage_pieces        = Column(Integer, nullable=False, default=2)

    # Airport
    airport_pickup_charge     = Column(Float, nullable=False, default=0.0)
    airport_drop_charge       = Column(Float, nullable=False, default=0.0)

    # InterCity specific
    driver_allowance_per_day  = Column(Float, nullable=False, default=0.0)

    # Taxes & Fees (stored here for transparency — applied as percentages)
    insurance_fee             = Column(Float, nullable=False, default=0.0)   # fixed amount per trip
    platform_fee_fixed        = Column(Float, nullable=False, default=0.0)
    platform_fee_percentage   = Column(Float, nullable=False, default=0.0)   # % of subtotal
    gst_percentage            = Column(Float, nullable=False, default=5.0)

    # Version control
    version                   = Column(Integer, nullable=False, default=1)
    is_active                 = Column(Boolean, default=False)
    effective_from            = Column(DateTime, nullable=True)
    effective_to              = Column(DateTime, nullable=True)
    notes                     = Column(Text, nullable=True)

    created_at                = Column(DateTime, default=datetime.utcnow)
    created_by                = Column(String(100), nullable=True)

    city = relationship("City")

    __table_args__ = (
        Index("ix_vbr_city_ride_vehicle", "city_id", "ride_type", "vehicle_category"),
    )

    def __repr__(self):
        return f"<VehicleBaseRate {self.name} v{self.version} active={self.is_active}>"


# ─── Peak Hour Rule ───────────────────────────────────────────────────────────

class PeakHourRule(Base):
    """
    Time-of-day multipliers: peak hours, night charges, holidays, festivals.
    Supports effective date ranges so seasonal rules coexist without conflict.
    Priority field resolves conflicts when multiple rules match.
    """
    __tablename__ = "pricing_peak_rules"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                   = Column(String(150), nullable=False)
    city_id                = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ride_type              = Column(SAEnum(RideType), nullable=True)   # NULL = applies to both

    # Time windows (hour:minute as integer, e.g. 730 = 07:30)
    peak_start_hour        = Column(Integer, nullable=False, default=7)
    peak_start_minute      = Column(Integer, nullable=False, default=0)
    peak_end_hour          = Column(Integer, nullable=False, default=10)
    peak_end_minute        = Column(Integer, nullable=False, default=0)
    peak_hour_multiplier   = Column(Float, nullable=False, default=1.0)

    evening_start_hour     = Column(Integer, nullable=False, default=17)
    evening_start_minute   = Column(Integer, nullable=False, default=0)
    evening_end_hour       = Column(Integer, nullable=False, default=21)
    evening_end_minute     = Column(Integer, nullable=False, default=0)
    evening_multiplier     = Column(Float, nullable=False, default=1.0)

    night_start_hour       = Column(Integer, nullable=False, default=22)
    night_end_hour         = Column(Integer, nullable=False, default=5)
    night_charge_multiplier = Column(Float, nullable=False, default=1.0)

    holiday_multiplier     = Column(Float, nullable=False, default=1.0)
    festival_multiplier    = Column(Float, nullable=False, default=1.0)

    # Date range validity
    effective_from         = Column(DateTime, nullable=True)
    effective_to           = Column(DateTime, nullable=True)

    priority               = Column(Integer, nullable=False, default=0)  # higher = takes precedence
    is_active              = Column(Boolean, default=True)
    version                = Column(Integer, nullable=False, default=1)

    created_at             = Column(DateTime, default=datetime.utcnow)
    created_by             = Column(String(100), nullable=True)

    city = relationship("City")


# ─── Surge Rule ───────────────────────────────────────────────────────────────

class SurgeRule(Base):
    """
    Dynamic demand-based surge multiplier.
    In production, the multiplier value is updated by a demand signal service.
    """
    __tablename__ = "pricing_surge_rules"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                = Column(String(150), nullable=False)
    city_id             = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ride_type           = Column(SAEnum(RideType), nullable=True)
    vehicle_category    = Column(SAEnum(VehicleCategory), nullable=True)

    current_multiplier  = Column(Float, nullable=False, default=1.0)
    min_multiplier      = Column(Float, nullable=False, default=1.0)
    max_multiplier      = Column(Float, nullable=False, default=3.0)

    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by          = Column(String(100), nullable=True)

    city = relationship("City")


# ─── Weather Rule ─────────────────────────────────────────────────────────────

class WeatherRule(Base):
    """Weather-based pricing adjustment. Triggered by external weather service."""
    __tablename__ = "pricing_weather_rules"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name                = Column(String(150), nullable=False)
    city_id             = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    weather_condition   = Column(String(50), nullable=False, default="RAIN")  # RAIN, STORM, FLOOD, FOG
    multiplier          = Column(Float, nullable=False, default=1.0)

    is_active           = Column(Boolean, default=False)  # Only admin or weather service activates
    created_at          = Column(DateTime, default=datetime.utcnow)
    created_by          = Column(String(100), nullable=True)

    city = relationship("City")


# ─── Toll Rule ────────────────────────────────────────────────────────────────

class TollRule(Base):
    """Toll charges for specific city/corridor. Added to fare as a fixed amount."""
    __tablename__ = "pricing_toll_rules"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(150), nullable=False)
    city_id          = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ride_type        = Column(SAEnum(RideType), nullable=True)
    vehicle_category = Column(SAEnum(VehicleCategory), nullable=True)
    toll_amount      = Column(Float, nullable=False, default=0.0)
    description      = Column(String(255), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    created_by       = Column(String(100), nullable=True)

    city = relationship("City")


# ─── State Border Charge ──────────────────────────────────────────────────────

class StateBorderCharge(Base):
    """Charge applied when a ride crosses state boundaries (InterCity)."""
    __tablename__ = "pricing_state_charges"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name             = Column(String(150), nullable=False)
    origin_state     = Column(String(100), nullable=False)
    destination_state = Column(String(100), nullable=False)
    charge_amount    = Column(Float, nullable=False, default=0.0)
    vehicle_category = Column(SAEnum(VehicleCategory), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    created_by       = Column(String(100), nullable=True)


# ─── Pricing Rule Version (Immutable Snapshot) ────────────────────────────────

class PricingRuleVersion(Base):
    """
    Immutable snapshot that ties together all active rules for a given
    city + ride_type + vehicle_category combination.
    
    NEVER update a version — create a new one and activate it.
    All bookings reference the version that was active at booking time.
    """
    __tablename__ = "pricing_rule_versions"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_tag         = Column(String(50), nullable=False)   # e.g. "v2025.07.01-HATCHBACK-BLR"
    city_id             = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ride_type           = Column(SAEnum(RideType),        nullable=False)
    vehicle_category    = Column(SAEnum(VehicleCategory), nullable=False)

    # Rule references (all nullable except base_rate)
    base_rate_id        = Column(UUID(as_uuid=True), ForeignKey("vehicle_base_rates.id"), nullable=False)
    peak_rule_id        = Column(UUID(as_uuid=True), ForeignKey("pricing_peak_rules.id"),    nullable=True)
    surge_rule_id       = Column(UUID(as_uuid=True), ForeignKey("pricing_surge_rules.id"),   nullable=True)
    weather_rule_id     = Column(UUID(as_uuid=True), ForeignKey("pricing_weather_rules.id"), nullable=True)
    toll_rule_id        = Column(UUID(as_uuid=True), ForeignKey("pricing_toll_rules.id"),    nullable=True)

    is_active           = Column(Boolean, default=False)
    priority            = Column(Integer, nullable=False, default=0)
    effective_from      = Column(DateTime, nullable=True)
    effective_to        = Column(DateTime, nullable=True)

    created_at          = Column(DateTime, default=datetime.utcnow)
    created_by          = Column(String(100), nullable=True)
    deactivated_at      = Column(DateTime, nullable=True)
    deactivated_by      = Column(String(100), nullable=True)
    notes               = Column(Text, nullable=True)

    # Relationships
    city         = relationship("City")
    base_rate    = relationship("VehicleBaseRate")
    peak_rule    = relationship("PeakHourRule")
    surge_rule   = relationship("SurgeRule")
    weather_rule = relationship("WeatherRule")
    toll_rule    = relationship("TollRule")

    __table_args__ = (
        Index("ix_prv_city_ride_vehicle_active",
              "city_id", "ride_type", "vehicle_category", "is_active"),
    )

    def __repr__(self):
        return f"<PricingRuleVersion {self.version_tag} active={self.is_active}>"


# ─── Pricing Audit Log ────────────────────────────────────────────────────────

class PricingAuditLog(Base):
    """
    Immutable audit trail for ALL pricing events:
    - Fare calculations (one row per estimate call)
    - Admin configuration changes (rule creates, activations, deactivations)
    """
    __tablename__ = "pricing_audit_log"

    id                          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # What kind of event
    event_type                  = Column(String(50), nullable=False)  # FARE_ESTIMATE | RULE_CREATE | RULE_ACTIVATE | RULE_DEACTIVATE

    # Rule version used (for FARE_ESTIMATE events)
    rule_version_id             = Column(UUID(as_uuid=True), ForeignKey("pricing_rule_versions.id"), nullable=True)

    # Booking linkage
    booking_ref                 = Column(String(50), nullable=True, index=True)

    # Ride context
    city_id                     = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ride_type                   = Column(SAEnum(RideType),        nullable=True)
    vehicle_category            = Column(SAEnum(VehicleCategory), nullable=True)

    distance_km                 = Column(Float, nullable=True)
    duration_min                = Column(Float, nullable=True)

    # ── Complete Fare Breakdown ──
    base_fare                   = Column(Float, nullable=True)
    distance_fare               = Column(Float, nullable=True)
    time_fare                   = Column(Float, nullable=True)
    subtotal_raw                = Column(Float, nullable=True)
    minimum_fare_applied        = Column(Boolean, default=False)

    peak_multiplier             = Column(Float, nullable=True, default=1.0)
    peak_amount                 = Column(Float, nullable=True, default=0.0)
    night_multiplier            = Column(Float, nullable=True, default=1.0)
    night_amount                = Column(Float, nullable=True, default=0.0)
    holiday_multiplier          = Column(Float, nullable=True, default=1.0)
    holiday_amount              = Column(Float, nullable=True, default=0.0)
    surge_multiplier            = Column(Float, nullable=True, default=1.0)
    surge_amount                = Column(Float, nullable=True, default=0.0)
    weather_multiplier          = Column(Float, nullable=True, default=1.0)
    weather_amount              = Column(Float, nullable=True, default=0.0)

    subtotal_after_multipliers  = Column(Float, nullable=True)

    waiting_charge              = Column(Float, nullable=True, default=0.0)
    toll_charges                = Column(Float, nullable=True, default=0.0)
    parking_charges             = Column(Float, nullable=True, default=0.0)
    airport_pickup_charge       = Column(Float, nullable=True, default=0.0)
    airport_drop_charge         = Column(Float, nullable=True, default=0.0)
    driver_allowance            = Column(Float, nullable=True, default=0.0)
    state_border_charge         = Column(Float, nullable=True, default=0.0)

    subtotal_after_incidentals  = Column(Float, nullable=True)

    coupon_code                 = Column(String(50), nullable=True)
    coupon_discount             = Column(Float, nullable=True, default=0.0)
    wallet_deduction            = Column(Float, nullable=True, default=0.0)
    total_discounts             = Column(Float, nullable=True, default=0.0)

    subtotal_after_discounts    = Column(Float, nullable=True)

    gst_percentage              = Column(Float, nullable=True)
    gst_amount                  = Column(Float, nullable=True, default=0.0)
    insurance_fee               = Column(Float, nullable=True, default=0.0)
    platform_fee                = Column(Float, nullable=True, default=0.0)

    final_fare_unrounded        = Column(Float, nullable=True)
    final_fare                  = Column(Float, nullable=True)
    currency                    = Column(String(10), nullable=True, default="INR")

    # Admin change context (for RULE_* events)
    admin_user_id               = Column(String(100), nullable=True)
    changed_entity              = Column(String(100), nullable=True)  # e.g. "VehicleBaseRate"
    changed_entity_id           = Column(String(100), nullable=True)
    change_description          = Column(Text, nullable=True)

    created_at                  = Column(DateTime, default=datetime.utcnow, index=True)

    rule_version = relationship("PricingRuleVersion")
    city         = relationship("City")
