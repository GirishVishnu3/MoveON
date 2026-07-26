"""
MoveON Pricing Validation Engine
Validates all pricing rule configurations before they are saved.
Prevents negative fares, duplicate active rules, overlapping date ranges,
invalid multipliers, and incorrect GST percentages.
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.pricing import VehicleBaseRate, PricingRuleVersion, PeakHourRule, SurgeRule
from app.models.booking import RideType, VehicleCategory


class ValidationError:
    def __init__(self, field: str, message: str, severity: str = "ERROR"):
        self.field    = field
        self.message  = message
        self.severity = severity  # ERROR | WARNING

    def dict(self):
        return {"field": self.field, "message": self.message, "severity": self.severity}


class PricingValidationResult:
    def __init__(self):
        self.errors: List[ValidationError] = []

    def add_error(self, field: str, message: str):
        self.errors.append(ValidationError(field, message, "ERROR"))

    def add_warning(self, field: str, message: str):
        self.errors.append(ValidationError(field, message, "WARNING"))

    @property
    def is_valid(self) -> bool:
        return not any(e.severity == "ERROR" for e in self.errors)

    def as_dict(self):
        return {
            "valid":    self.is_valid,
            "errors":   [e.dict() for e in self.errors if e.severity == "ERROR"],
            "warnings": [e.dict() for e in self.errors if e.severity == "WARNING"],
        }


class PricingValidator:

    @staticmethod
    def validate_base_rate(data: dict) -> PricingValidationResult:
        result = PricingValidationResult()

        # Negative value checks
        for field in ["base_fare", "minimum_fare", "per_km_rate", "per_min_rate",
                      "waiting_charge_per_min", "cancellation_fee",
                      "airport_pickup_charge", "airport_drop_charge",
                      "driver_allowance_per_day", "insurance_fee",
                      "platform_fee_fixed", "platform_fee_percentage"]:
            val = data.get(field, 0)
            if val is not None and val < 0:
                result.add_error(field, f"{field} cannot be negative (got {val})")

        # GST range
        gst = data.get("gst_percentage", 5.0)
        if gst < 0 or gst > 28:
            result.add_error("gst_percentage", f"GST must be 0–28% (got {gst}%)")

        # Platform fee percentage sanity
        pf_pct = data.get("platform_fee_percentage", 0)
        if pf_pct > 50:
            result.add_warning("platform_fee_percentage",
                               f"Platform fee percentage {pf_pct}% seems unusually high")

        # Minimum fare vs base fare consistency warning
        base  = data.get("base_fare", 0)
        min_f = data.get("minimum_fare", 0)
        if base > min_f > 0:
            result.add_warning("minimum_fare",
                               f"minimum_fare ({min_f}) is less than base_fare ({base}) — "
                               "minimum fare will rarely be enforced")

        # Capacity
        for cap_field in ["max_passengers", "max_luggage_pieces"]:
            v = data.get(cap_field, 1)
            if v is not None and v < 1:
                result.add_error(cap_field, f"{cap_field} must be at least 1")

        return result

    @staticmethod
    def validate_surge_rule(data: dict) -> PricingValidationResult:
        result = PricingValidationResult()
        mn = data.get("min_multiplier", 1.0)
        mx = data.get("max_multiplier", 3.0)
        cur = data.get("current_multiplier", 1.0)

        if mn < 1.0:
            result.add_error("min_multiplier", f"Minimum surge multiplier must be ≥ 1.0 (got {mn})")
        if mx > 5.0:
            result.add_error("max_multiplier", f"Maximum surge multiplier cannot exceed 5.0 (got {mx})")
        if cur < mn:
            result.add_error("current_multiplier",
                             f"current_multiplier ({cur}) is below min_multiplier ({mn})")
        if cur > mx:
            result.add_error("current_multiplier",
                             f"current_multiplier ({cur}) exceeds max_multiplier ({mx})")
        return result

    @staticmethod
    def validate_peak_rule(data: dict) -> PricingValidationResult:
        result = PricingValidationResult()
        for mult_field in ["peak_hour_multiplier", "evening_multiplier",
                           "night_charge_multiplier", "holiday_multiplier", "festival_multiplier"]:
            v = data.get(mult_field, 1.0)
            if v is not None and v < 1.0:
                result.add_error(mult_field, f"{mult_field} must be ≥ 1.0 (got {v})")
            if v is not None and v > 5.0:
                result.add_error(mult_field, f"{mult_field} cannot exceed 5.0 (got {v})")

        ef = data.get("effective_from")
        et = data.get("effective_to")
        if ef and et and ef >= et:
            result.add_error("effective_to", "effective_to must be after effective_from")
        return result

    @staticmethod
    async def check_duplicate_active_version(
        db: AsyncSession,
        city_id: Optional[str],
        ride_type: RideType,
        vehicle_category: VehicleCategory,
        exclude_id: Optional[str] = None,
    ) -> PricingValidationResult:
        """
        Ensures no two active versions exist for the same
        city + ride_type + vehicle_category combination.
        """
        result = PricingValidationResult()
        q = select(PricingRuleVersion).where(
            PricingRuleVersion.city_id == city_id,
            PricingRuleVersion.ride_type == ride_type,
            PricingRuleVersion.vehicle_category == vehicle_category,
            PricingRuleVersion.is_active == True,
        )
        if exclude_id:
            q = q.where(PricingRuleVersion.id != exclude_id)
        r = await db.execute(q)
        existing = r.scalar_one_or_none()
        if existing:
            result.add_error(
                "is_active",
                f"A version '{existing.version_tag}' is already active for "
                f"{city_id or 'GLOBAL'}/{ride_type}/{vehicle_category}. "
                "Deactivate it before activating a new version."
            )
        return result

    @staticmethod
    async def check_overlapping_peak_rules(
        db: AsyncSession,
        city_id: Optional[str],
        effective_from: Optional[datetime],
        effective_to: Optional[datetime],
        exclude_id: Optional[str] = None,
    ) -> PricingValidationResult:
        """
        Checks for date-range overlaps in peak rules for the same city.
        Only applies when both effective_from and effective_to are set.
        """
        result = PricingValidationResult()
        if not (effective_from and effective_to):
            return result

        q = select(PeakHourRule).where(
            PeakHourRule.city_id == city_id,
            PeakHourRule.is_active == True,
            PeakHourRule.effective_from != None,
            PeakHourRule.effective_to != None,
            # Overlap condition: existing.start < new.end AND existing.end > new.start
            PeakHourRule.effective_from < effective_to,
            PeakHourRule.effective_to   > effective_from,
        )
        if exclude_id:
            q = q.where(PeakHourRule.id != exclude_id)
        r = await db.execute(q)
        conflicts = r.scalars().all()
        for c in conflicts:
            result.add_warning(
                "effective_from",
                f"Peak rule '{c.name}' overlaps this date range "
                f"({c.effective_from.date()} → {c.effective_to.date()}). "
                "Use priority field to resolve conflicts."
            )
        return result
