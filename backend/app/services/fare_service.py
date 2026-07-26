"""
MoveON Enterprise Fare Calculation Engine
==========================================
Fully async, 100% database-driven, zero hardcoded values.
Every fare is transparently calculated in 25 ordered steps.
All calculations are logged to pricing_audit_log.
"""
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.booking import RideType, VehicleCategory
from app.models.pricing import (
    VehicleBaseRate, PricingRuleVersion, PeakHourRule,
    SurgeRule, WeatherRule, TollRule, PricingAuditLog, City
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# Internal helper: load a rule version with full eager loading
# ═══════════════════════════════════════════════════════════════

async def _load_rule_version(
    db: AsyncSession,
    city_id: Optional[str],
    ride_type: RideType,
    vehicle_category: VehicleCategory,
) -> Optional[PricingRuleVersion]:
    """
    Priority resolution order:
      1. City-specific + ride_type + vehicle_category   (is_active=True)
      2. Global  (city_id IS NULL) + ride_type + vehicle_category
      3. Global  + ride_type any  + vehicle_category    (broadest fallback)
    Returns None if no rule found.
    """
    options = [
        selectinload(PricingRuleVersion.base_rate),
        selectinload(PricingRuleVersion.peak_rule),
        selectinload(PricingRuleVersion.surge_rule),
        selectinload(PricingRuleVersion.weather_rule),
        selectinload(PricingRuleVersion.toll_rule),
    ]

    # 1. City-specific
    if city_id:
        r = await db.execute(
            select(PricingRuleVersion)
            .where(
                PricingRuleVersion.city_id == city_id,
                PricingRuleVersion.ride_type == ride_type,
                PricingRuleVersion.vehicle_category == vehicle_category,
                PricingRuleVersion.is_active == True,
            )
            .options(*options)
            .order_by(PricingRuleVersion.priority.desc())
            .limit(1)
        )
        v = r.scalar_one_or_none()
        if v:
            return v

    # 2. Global by ride_type + vehicle
    r = await db.execute(
        select(PricingRuleVersion)
        .where(
            PricingRuleVersion.city_id == None,
            PricingRuleVersion.ride_type == ride_type,
            PricingRuleVersion.vehicle_category == vehicle_category,
            PricingRuleVersion.is_active == True,
        )
        .options(*options)
        .order_by(PricingRuleVersion.priority.desc())
        .limit(1)
    )
    v = r.scalar_one_or_none()
    if v:
        return v

    # 3. Broadest fallback: any active rule for this ride_type + vehicle
    r = await db.execute(
        select(PricingRuleVersion)
        .where(
            PricingRuleVersion.ride_type == ride_type,
            PricingRuleVersion.vehicle_category == vehicle_category,
            PricingRuleVersion.is_active == True,
        )
        .options(*options)
        .order_by(PricingRuleVersion.priority.desc())
        .limit(1)
    )
    return r.scalar_one_or_none()


async def _load_city_by_id(db: AsyncSession, city_id: str) -> Optional[City]:
    r = await db.execute(select(City).where(City.id == city_id))
    return r.scalar_one_or_none()


# ═══════════════════════════════════════════════════════════════
# Time-of-day helpers
# ═══════════════════════════════════════════════════════════════

def _in_time_window(now_hour: int, now_min: int,
                    start_h: int, start_m: int,
                    end_h: int, end_m: int) -> bool:
    now_t   = now_hour * 60 + now_min
    start_t = start_h  * 60 + start_m
    end_t   = end_h    * 60 + end_m
    if start_t <= end_t:
        return start_t <= now_t < end_t
    else:  # wraps midnight (e.g. 22:00–05:00)
        return now_t >= start_t or now_t < end_t


def _get_time_multipliers(peak_rule: Optional[PeakHourRule], now: datetime) -> Dict[str, float]:
    if not peak_rule:
        return {"peak": 1.0, "night": 1.0, "holiday": 1.0}

    h, m = now.hour, now.minute
    peak   = 1.0
    night  = 1.0

    # Morning peak
    if _in_time_window(h, m,
                       peak_rule.peak_start_hour, peak_rule.peak_start_minute,
                       peak_rule.peak_end_hour,   peak_rule.peak_end_minute):
        peak = peak_rule.peak_hour_multiplier

    # Evening peak
    if _in_time_window(h, m,
                       peak_rule.evening_start_hour, peak_rule.evening_start_minute,
                       peak_rule.evening_end_hour,   peak_rule.evening_end_minute):
        peak = max(peak, peak_rule.evening_multiplier)

    # Night charge
    if _in_time_window(h, m, peak_rule.night_start_hour, 0, peak_rule.night_end_hour, 0):
        night = peak_rule.night_charge_multiplier

    return {"peak": peak, "night": night, "holiday": peak_rule.holiday_multiplier}


# ═══════════════════════════════════════════════════════════════
# Main Fare Calculation Engine
# ═══════════════════════════════════════════════════════════════

class FareService:

    @classmethod
    async def estimate_fare(
        cls,
        db: AsyncSession,
        ride_type: RideType,
        vehicle_category: VehicleCategory,
        distance_km: float,
        duration_min: float,
        city_id: Optional[str] = None,
        is_round_trip: bool = False,
        is_airport_pickup: bool = False,
        is_airport_drop: bool = False,
        waiting_min: float = 0.0,
        coupon_discount: float = 0.0,
        wallet_deduction: float = 0.0,
        trip_days: float = 1.0,
        parking_charges: float = 0.0,
        state_border_charge: float = 0.0,
        coupon_code: Optional[str] = None,
        now: Optional[datetime] = None,
        booking_ref: Optional[str] = None,
        log_event: bool = True,
    ) -> Dict[str, Any]:
        if now is None:
            now = datetime.now()

        # ── STEP 1: Validate ──────────────────────────────────────────────
        if distance_km <= 0:
            raise ValueError("distance_km must be greater than 0")
        if duration_min < 0:
            raise ValueError("duration_min cannot be negative")
        if trip_days < 1:
            trip_days = 1.0

        # ── STEP 2: Load pricing rule version ─────────────────────────────
        rule = await _load_rule_version(db, city_id, ride_type, vehicle_category)
        if not rule:
            raise RuntimeError(
                f"No active pricing rule for ride_type={ride_type.value}, "
                f"vehicle_category={vehicle_category.value}. "
                "Configure rules via the Admin Pricing panel."
            )
        br = rule.base_rate  # VehicleBaseRate

        # ── STEP 3: Load city metadata ─────────────────────────────────────
        city = None
        if city_id:
            city = await _load_city_by_id(db, city_id)
        currency = city.currency if city else "INR"

        # ── STEP 4: Effective distance ─────────────────────────────────────
        effective_distance = distance_km * 2 if is_round_trip else distance_km

        # ── STEP 5: Base fare ─────────────────────────────────────────────
        base_fare = br.base_fare

        # ── STEP 6: Distance fare ─────────────────────────────────────────
        distance_fare = br.per_km_rate * effective_distance

        # ── STEP 7: Time fare ─────────────────────────────────────────────
        time_fare = br.per_min_rate * duration_min

        # ── STEP 8: Raw subtotal ──────────────────────────────────────────
        subtotal_raw = base_fare + distance_fare + time_fare

        # ── STEP 9: Enforce minimum fare ─────────────────────────────────
        minimum_fare_applied = False
        if subtotal_raw < br.minimum_fare:
            subtotal_raw = br.minimum_fare
            minimum_fare_applied = True

        # ── STEPS 10–14: Time-of-day multipliers ─────────────────────────
        time_mults = _get_time_multipliers(rule.peak_rule, now)
        peak_multiplier    = time_mults["peak"]
        night_multiplier   = time_mults["night"]
        holiday_multiplier = time_mults["holiday"]

        peak_amount    = subtotal_raw * (peak_multiplier  - 1.0)
        night_amount   = subtotal_raw * (night_multiplier - 1.0)
        holiday_amount = subtotal_raw * (holiday_multiplier - 1.0)

        # ── STEP 15: Surge multiplier ─────────────────────────────────────
        surge_multiplier = rule.surge_rule.current_multiplier if rule.surge_rule else 1.0
        surge_amount     = subtotal_raw * (surge_multiplier - 1.0)

        # ── STEP 16: Weather multiplier ───────────────────────────────────
        weather_multiplier = rule.weather_rule.multiplier if (rule.weather_rule and rule.weather_rule.is_active) else 1.0
        weather_amount     = subtotal_raw * (weather_multiplier - 1.0)

        subtotal_after_multipliers = (
            subtotal_raw
            + peak_amount + night_amount + holiday_amount
            + surge_amount + weather_amount
        )

        # ── STEP 17: Waiting charges ──────────────────────────────────────
        billable_waiting = max(0.0, waiting_min - br.free_waiting_min)
        waiting_charge   = round(billable_waiting * br.waiting_charge_per_min, 2)

        # ── STEP 18: Toll charges ─────────────────────────────────────────
        toll_charges = rule.toll_rule.toll_amount if rule.toll_rule else 0.0

        # ── STEP 19: Airport charges ──────────────────────────────────────
        airport_pickup_charge = br.airport_pickup_charge if is_airport_pickup else 0.0
        airport_drop_charge   = br.airport_drop_charge   if is_airport_drop   else 0.0

        # ── STEP 20: Driver allowance (InterCity) ─────────────────────────
        driver_allowance = (
            br.driver_allowance_per_day * trip_days
            if ride_type == RideType.INTERCITY else 0.0
        )

        # ── STEP 21: State border charge ──────────────────────────────────
        # Passed in from caller when route crosses state boundaries

        subtotal_after_incidentals = (
            subtotal_after_multipliers
            + waiting_charge + toll_charges + parking_charges
            + airport_pickup_charge + airport_drop_charge
            + driver_allowance + state_border_charge
        )

        # ── STEP 22: Coupon discount ──────────────────────────────────────
        coupon_disc = min(coupon_discount, subtotal_after_incidentals)

        # ── STEP 23: Wallet deduction ─────────────────────────────────────
        wallet_ded = min(wallet_deduction, subtotal_after_incidentals - coupon_disc)

        total_discounts       = coupon_disc + wallet_ded
        subtotal_after_discounts = subtotal_after_incidentals - total_discounts

        # ── STEP 24: GST ──────────────────────────────────────────────────
        gst_percentage = br.gst_percentage
        gst_amount     = round(subtotal_after_discounts * gst_percentage / 100, 2)

        # ── STEP 25: Insurance + Platform fee → FINAL FARE ───────────────
        insurance_fee = br.insurance_fee
        platform_fee  = round(
            br.platform_fee_fixed
            + (subtotal_after_discounts * br.platform_fee_percentage / 100),
            2
        )

        final_fare_unrounded = subtotal_after_discounts + gst_amount + insurance_fee + platform_fee
        final_fare           = round(final_fare_unrounded)  # round to nearest ₹

        # ── Build complete breakdown ──────────────────────────────────────
        result = {
            # Metadata
            "pricing_rule_version_id": str(rule.id),
            "pricing_version_tag":     rule.version_tag,
            "base_rate_id":            str(br.id),
            "city_id":                 city_id,
            "city_name":               city.name if city else "Global",
            "ride_type":               ride_type.value,
            "vehicle_category":        vehicle_category.value,
            "is_round_trip":           is_round_trip,
            "effective_distance_km":   effective_distance,
            "currency":                currency,
            "calculated_at":           now.isoformat(),

            # Core components
            "base_fare":               round(base_fare, 2),
            "distance_fare":           round(distance_fare, 2),
            "time_fare":               round(time_fare, 2),
            "subtotal_raw":            round(subtotal_raw, 2),
            "minimum_fare_applied":    minimum_fare_applied,
            "minimum_fare":            br.minimum_fare,

            # Multipliers
            "peak_multiplier":         peak_multiplier,
            "peak_amount":             round(peak_amount, 2),
            "night_multiplier":        night_multiplier,
            "night_amount":            round(night_amount, 2),
            "holiday_multiplier":      holiday_multiplier,
            "holiday_amount":          round(holiday_amount, 2),
            "surge_multiplier":        surge_multiplier,
            "surge_amount":            round(surge_amount, 2),
            "weather_multiplier":      weather_multiplier,
            "weather_amount":          round(weather_amount, 2),
            "subtotal_after_multipliers": round(subtotal_after_multipliers, 2),

            # Incidentals
            "waiting_charge":          round(waiting_charge, 2),
            "toll_charges":            round(toll_charges, 2),
            "parking_charges":         round(parking_charges, 2),
            "airport_pickup_charge":   round(airport_pickup_charge, 2),
            "airport_drop_charge":     round(airport_drop_charge, 2),
            "driver_allowance":        round(driver_allowance, 2),
            "state_border_charge":     round(state_border_charge, 2),
            "subtotal_after_incidentals": round(subtotal_after_incidentals, 2),

            # Discounts
            "coupon_code":             coupon_code,
            "coupon_discount":         round(coupon_disc, 2),
            "wallet_deduction":        round(wallet_ded, 2),
            "total_discounts":         round(total_discounts, 2),
            "subtotal_after_discounts": round(subtotal_after_discounts, 2),

            # Taxes & fees
            "gst_percentage":          gst_percentage,
            "gst_amount":              gst_amount,
            "insurance_fee":           round(insurance_fee, 2),
            "platform_fee":            round(platform_fee, 2),

            # Final
            "final_fare_unrounded":    round(final_fare_unrounded, 2),
            "total_fare":              final_fare,  # rounded
            "subtotal_before_discounts": round(subtotal_after_incidentals, 2),

            # Compact breakdown for UI display
            "breakdown": {
                "base":             round(base_fare, 2),
                "distance":         round(distance_fare, 2),
                "duration":         round(time_fare, 2),
                "peak_surge":       round(peak_amount + surge_amount, 2),
                "night":            round(night_amount, 2),
                "weather":          round(weather_amount, 2),
                "waiting":          round(waiting_charge, 2),
                "airport":          round(airport_pickup_charge + airport_drop_charge, 2),
                "tolls_parking":    round(toll_charges + parking_charges, 2),
                "driver_allowance": round(driver_allowance, 2),
                "discounts":        round(total_discounts, 2),
                "gst":              round(gst_amount, 2),
                "insurance":        round(insurance_fee, 2),
                "platform_fee":     round(platform_fee, 2),
            },
        }

        # ── Log to pricing_audit_log (non-fatal) ──────────────────────────
        if log_event:
            try:
                log = PricingAuditLog(
                    event_type                 = "FARE_ESTIMATE",
                    rule_version_id            = rule.id,
                    booking_ref                = booking_ref,
                    city_id                    = city_id,
                    ride_type                  = ride_type,
                    vehicle_category           = vehicle_category,
                    distance_km                = distance_km,
                    duration_min               = duration_min,
                    base_fare                  = round(base_fare, 2),
                    distance_fare              = round(distance_fare, 2),
                    time_fare                  = round(time_fare, 2),
                    subtotal_raw               = round(subtotal_raw, 2),
                    minimum_fare_applied       = minimum_fare_applied,
                    peak_multiplier            = peak_multiplier,
                    peak_amount                = round(peak_amount, 2),
                    night_multiplier           = night_multiplier,
                    night_amount               = round(night_amount, 2),
                    holiday_multiplier         = holiday_multiplier,
                    holiday_amount             = round(holiday_amount, 2),
                    surge_multiplier           = surge_multiplier,
                    surge_amount               = round(surge_amount, 2),
                    weather_multiplier         = weather_multiplier,
                    weather_amount             = round(weather_amount, 2),
                    subtotal_after_multipliers = round(subtotal_after_multipliers, 2),
                    waiting_charge             = round(waiting_charge, 2),
                    toll_charges               = round(toll_charges, 2),
                    parking_charges            = round(parking_charges, 2),
                    airport_pickup_charge      = round(airport_pickup_charge, 2),
                    airport_drop_charge        = round(airport_drop_charge, 2),
                    driver_allowance           = round(driver_allowance, 2),
                    state_border_charge        = round(state_border_charge, 2),
                    subtotal_after_incidentals = round(subtotal_after_incidentals, 2),
                    coupon_code                = coupon_code,
                    coupon_discount            = round(coupon_disc, 2),
                    wallet_deduction           = round(wallet_ded, 2),
                    total_discounts            = round(total_discounts, 2),
                    subtotal_after_discounts   = round(subtotal_after_discounts, 2),
                    gst_percentage             = gst_percentage,
                    gst_amount                 = gst_amount,
                    insurance_fee              = round(insurance_fee, 2),
                    platform_fee               = round(platform_fee, 2),
                    final_fare_unrounded       = round(final_fare_unrounded, 2),
                    final_fare                 = final_fare,
                    currency                   = currency,
                )
                db.add(log)
                await db.commit()
            except Exception as e:
                logger.warning(f"[FareService] Audit log write failed (non-fatal): {e}")
                await db.rollback()

        logger.info(
            f"[FareEngine] {ride_type.value}/{vehicle_category.value} | "
            f"{effective_distance}km/{duration_min}min → {currency} {final_fare} | "
            f"rule={rule.version_tag}"
        )

        return result

    @classmethod
    async def estimate_all_categories(
        cls,
        db: AsyncSession,
        ride_type: RideType,
        distance_km: float,
        duration_min: float,
        city_id: Optional[str] = None,
        is_round_trip: bool = False,
        is_airport_pickup: bool = False,
        is_airport_drop: bool = False,
        now: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns fare estimates for all VehicleCategory values that have
        a configured and active pricing rule version. Skips categories
        with no rule configured (no error raised for them).
        """
        results = []
        for category in VehicleCategory:
            try:
                fare = await cls.estimate_fare(
                    db=db,
                    ride_type=ride_type,
                    vehicle_category=category,
                    distance_km=distance_km,
                    duration_min=duration_min,
                    city_id=city_id,
                    is_round_trip=is_round_trip,
                    is_airport_pickup=is_airport_pickup,
                    is_airport_drop=is_airport_drop,
                    now=now,
                    log_event=False,  # Bulk estimate — skip individual logging
                )
                results.append(fare)
            except RuntimeError:
                pass  # No rule for this category — skip silently
            except Exception as e:
                logger.warning(f"[FareService] Skipping {category.name}: {e}")
                await db.rollback()

        return results
