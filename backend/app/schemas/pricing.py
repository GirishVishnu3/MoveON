"""
MoveON Enterprise Pricing Schemas
Complete request/response types for all pricing entities.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime


# ─── Pagination Wrapper ───────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    total:   int
    page:    int
    limit:   int
    pages:   int
    items:   List[Any]


# ─── City ─────────────────────────────────────────────────────────────────────

class CityCreate(BaseModel):
    name:        str
    state:       Optional[str]  = None
    country:     str            = "India"
    timezone:    str            = "Asia/Kolkata"
    currency:    str            = "INR"
    lat_center:  Optional[float] = None
    lon_center:  Optional[float] = None
    radius_km:   float          = 50.0
    is_active:   bool           = True

class CityUpdate(BaseModel):
    state:      Optional[str]   = None
    timezone:   Optional[str]   = None
    currency:   Optional[str]   = None
    lat_center: Optional[float] = None
    lon_center: Optional[float] = None
    radius_km:  Optional[float] = None
    is_active:  Optional[bool]  = None

class CityResponse(BaseModel):
    id:         UUID
    name:       str
    state:      Optional[str]
    country:    str
    timezone:   str
    currency:   str
    lat_center: Optional[float]
    lon_center: Optional[float]
    radius_km:  float
    is_active:  bool
    created_at: datetime
    class Config:
        from_attributes = True


# ─── Vehicle Base Rate ────────────────────────────────────────────────────────

class VehicleBaseRateCreate(BaseModel):
    name:                     str
    city_id:                  Optional[UUID] = None
    ride_type:                str
    vehicle_category:         str
    base_fare:                float = Field(ge=0)
    minimum_fare:             float = Field(ge=0)
    per_km_rate:              float = Field(ge=0)
    per_min_rate:             float = Field(ge=0)
    waiting_charge_per_min:   float = Field(ge=0, default=0.0)
    free_waiting_min:         int   = Field(ge=0, default=5)
    cancellation_fee:         float = Field(ge=0, default=0.0)
    free_cancellation_min:    int   = Field(ge=0, default=5)
    max_passengers:           int   = Field(ge=1, default=4)
    max_luggage_pieces:       int   = Field(ge=0, default=2)
    airport_pickup_charge:    float = Field(ge=0, default=0.0)
    airport_drop_charge:      float = Field(ge=0, default=0.0)
    driver_allowance_per_day: float = Field(ge=0, default=0.0)
    insurance_fee:            float = Field(ge=0, default=0.0)
    platform_fee_fixed:       float = Field(ge=0, default=0.0)
    platform_fee_percentage:  float = Field(ge=0, le=50, default=0.0)
    gst_percentage:           float = Field(ge=0, le=28, default=5.0)
    version:                  int   = 1
    is_active:                bool  = False
    effective_from:           Optional[datetime] = None
    effective_to:             Optional[datetime] = None
    notes:                    Optional[str] = None

class VehicleBaseRateResponse(BaseModel):
    id:                       UUID
    name:                     str
    city_id:                  Optional[UUID]
    ride_type:                str
    vehicle_category:         str
    base_fare:                float
    minimum_fare:             float
    per_km_rate:              float
    per_min_rate:             float
    waiting_charge_per_min:   float
    free_waiting_min:         int
    cancellation_fee:         float
    free_cancellation_min:    int
    max_passengers:           int
    max_luggage_pieces:       int
    airport_pickup_charge:    float
    airport_drop_charge:      float
    driver_allowance_per_day: float
    insurance_fee:            float
    platform_fee_fixed:       float
    platform_fee_percentage:  float
    gst_percentage:           float
    version:                  int
    is_active:                bool
    effective_from:           Optional[datetime]
    effective_to:             Optional[datetime]
    notes:                    Optional[str]
    created_at:               datetime
    created_by:               Optional[str]
    class Config:
        from_attributes = True


# ─── Peak Hour Rule ───────────────────────────────────────────────────────────

class PeakHourRuleCreate(BaseModel):
    name:                    str
    city_id:                 Optional[UUID] = None
    ride_type:               Optional[str]  = None
    peak_start_hour:         int = Field(ge=0, le=23, default=7)
    peak_start_minute:       int = Field(ge=0, le=59, default=0)
    peak_end_hour:           int = Field(ge=0, le=23, default=10)
    peak_end_minute:         int = Field(ge=0, le=59, default=0)
    peak_hour_multiplier:    float = Field(ge=1.0, le=5.0, default=1.0)
    evening_start_hour:      int = Field(ge=0, le=23, default=17)
    evening_start_minute:    int = Field(ge=0, le=59, default=0)
    evening_end_hour:        int = Field(ge=0, le=23, default=21)
    evening_end_minute:      int = Field(ge=0, le=59, default=0)
    evening_multiplier:      float = Field(ge=1.0, le=5.0, default=1.0)
    night_start_hour:        int = Field(ge=0, le=23, default=22)
    night_end_hour:          int = Field(ge=0, le=23, default=5)
    night_charge_multiplier: float = Field(ge=1.0, le=5.0, default=1.0)
    holiday_multiplier:      float = Field(ge=1.0, le=5.0, default=1.0)
    festival_multiplier:     float = Field(ge=1.0, le=5.0, default=1.0)
    effective_from:          Optional[datetime] = None
    effective_to:            Optional[datetime] = None
    priority:                int = 0
    is_active:               bool = True
    version:                 int = 1

class PeakHourRuleResponse(PeakHourRuleCreate):
    id:         UUID
    created_at: datetime
    created_by: Optional[str]
    class Config:
        from_attributes = True


# ─── Surge Rule ───────────────────────────────────────────────────────────────

class SurgeRuleCreate(BaseModel):
    name:               str
    city_id:            Optional[UUID] = None
    ride_type:          Optional[str]  = None
    vehicle_category:   Optional[str]  = None
    current_multiplier: float = Field(ge=1.0, le=5.0, default=1.0)
    min_multiplier:     float = Field(ge=1.0, default=1.0)
    max_multiplier:     float = Field(ge=1.0, le=5.0, default=3.0)
    is_active:          bool = True

class SurgeRuleUpdate(BaseModel):
    current_multiplier: Optional[float] = Field(ge=1.0, le=5.0, default=None)
    is_active:          Optional[bool]  = None

class SurgeRuleResponse(SurgeRuleCreate):
    id:         UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    class Config:
        from_attributes = True


# ─── Weather Rule ─────────────────────────────────────────────────────────────

class WeatherRuleCreate(BaseModel):
    name:              str
    city_id:           Optional[UUID] = None
    weather_condition: str = "RAIN"
    multiplier:        float = Field(ge=1.0, le=5.0, default=1.0)
    is_active:         bool = False

class WeatherRuleResponse(WeatherRuleCreate):
    id:         UUID
    created_at: datetime
    created_by: Optional[str]
    class Config:
        from_attributes = True


# ─── Toll Rule ────────────────────────────────────────────────────────────────

class TollRuleCreate(BaseModel):
    name:             str
    city_id:          Optional[UUID] = None
    ride_type:        Optional[str]  = None
    vehicle_category: Optional[str]  = None
    toll_amount:      float = Field(ge=0, default=0.0)
    description:      Optional[str]  = None
    is_active:        bool = True

class TollRuleResponse(TollRuleCreate):
    id:         UUID
    created_at: datetime
    created_by: Optional[str]
    class Config:
        from_attributes = True


# ─── State Border Charge ──────────────────────────────────────────────────────

class StateBorderChargeCreate(BaseModel):
    name:              str
    origin_state:      str
    destination_state: str
    charge_amount:     float = Field(ge=0, default=0.0)
    vehicle_category:  Optional[str] = None
    is_active:         bool = True

class StateBorderChargeResponse(StateBorderChargeCreate):
    id:         UUID
    created_at: datetime
    created_by: Optional[str]
    class Config:
        from_attributes = True


# ─── Pricing Rule Version ─────────────────────────────────────────────────────

class PricingVersionCreate(BaseModel):
    version_tag:      str
    city_id:          Optional[UUID] = None
    ride_type:        str
    vehicle_category: str
    base_rate_id:     UUID
    peak_rule_id:     Optional[UUID] = None
    surge_rule_id:    Optional[UUID] = None
    weather_rule_id:  Optional[UUID] = None
    toll_rule_id:     Optional[UUID] = None
    is_active:        bool = False
    priority:         int  = 0
    effective_from:   Optional[datetime] = None
    effective_to:     Optional[datetime] = None
    notes:            Optional[str] = None

class PricingVersionResponse(BaseModel):
    id:               UUID
    version_tag:      str
    city_id:          Optional[UUID]
    ride_type:        str
    vehicle_category: str
    base_rate_id:     UUID
    peak_rule_id:     Optional[UUID]
    surge_rule_id:    Optional[UUID]
    weather_rule_id:  Optional[UUID]
    toll_rule_id:     Optional[UUID]
    is_active:        bool
    priority:         int
    effective_from:   Optional[datetime]
    effective_to:     Optional[datetime]
    notes:            Optional[str]
    created_at:       datetime
    created_by:       Optional[str]
    deactivated_at:   Optional[datetime]
    deactivated_by:   Optional[str]
    class Config:
        from_attributes = True


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id:                         UUID
    event_type:                 str
    rule_version_id:            Optional[UUID]
    booking_ref:                Optional[str]
    city_id:                    Optional[UUID]
    ride_type:                  Optional[str]
    vehicle_category:           Optional[str]
    distance_km:                Optional[float]
    duration_min:               Optional[float]
    base_fare:                  Optional[float]
    distance_fare:              Optional[float]
    time_fare:                  Optional[float]
    subtotal_raw:               Optional[float]
    peak_multiplier:            Optional[float]
    peak_amount:                Optional[float]
    night_multiplier:           Optional[float]
    night_amount:               Optional[float]
    surge_multiplier:           Optional[float]
    surge_amount:               Optional[float]
    weather_multiplier:         Optional[float]
    weather_amount:             Optional[float]
    subtotal_after_multipliers: Optional[float]
    waiting_charge:             Optional[float]
    toll_charges:               Optional[float]
    airport_pickup_charge:      Optional[float]
    airport_drop_charge:        Optional[float]
    driver_allowance:           Optional[float]
    coupon_code:                Optional[str]
    coupon_discount:            Optional[float]
    wallet_deduction:           Optional[float]
    total_discounts:            Optional[float]
    gst_percentage:             Optional[float]
    gst_amount:                 Optional[float]
    insurance_fee:              Optional[float]
    platform_fee:               Optional[float]
    final_fare:                 Optional[float]
    currency:                   Optional[str]
    admin_user_id:              Optional[str]
    change_description:         Optional[str]
    created_at:                 datetime
    class Config:
        from_attributes = True


# ─── Full Fare Breakdown Response (returned by /estimate) ────────────────────

class FareBreakdownResponse(BaseModel):
    # Identity
    pricing_rule_version_id:   str
    pricing_version_tag:       str
    base_rate_id:              str
    city_id:                   Optional[str]
    city_name:                 str
    ride_type:                 str
    vehicle_category:          str
    is_round_trip:             bool
    effective_distance_km:     float
    currency:                  str
    calculated_at:             str

    # Core
    base_fare:                 float
    distance_fare:             float
    time_fare:                 float
    subtotal_raw:              float
    minimum_fare_applied:      bool
    minimum_fare:              float

    # Multipliers
    peak_multiplier:           float
    peak_amount:               float
    night_multiplier:          float
    night_amount:              float
    holiday_multiplier:        float
    holiday_amount:            float
    surge_multiplier:          float
    surge_amount:              float
    weather_multiplier:        float
    weather_amount:            float
    subtotal_after_multipliers: float

    # Incidentals
    waiting_charge:            float
    toll_charges:              float
    parking_charges:           float
    airport_pickup_charge:     float
    airport_drop_charge:       float
    driver_allowance:          float
    state_border_charge:       float
    subtotal_after_incidentals: float

    # Discounts
    coupon_code:               Optional[str]
    coupon_discount:           float
    wallet_deduction:          float
    total_discounts:           float
    subtotal_after_discounts:  float
    subtotal_before_discounts: float

    # Taxes & Fees
    gst_percentage:            float
    gst_amount:                float
    insurance_fee:             float
    platform_fee:              float

    # Final
    final_fare_unrounded:      float
    total_fare:                float   # ← rounded final payable amount
    breakdown:                 Dict[str, float]
