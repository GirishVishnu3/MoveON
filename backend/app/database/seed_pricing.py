"""
Seed Enterprise Pricing Rules
=============================
Creates realistic pricing base rates and active rule versions
for all 10 vehicle categories across IntraCity and InterCity.
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database.database import AsyncSessionLocal
from app.models.booking import RideType, VehicleCategory
from app.models.pricing import City, VehicleBaseRate, PricingRuleVersion

# Ensure all models are loaded so mapper is configured
from app.models.user import User
from app.models.auth import OtpRequest
from app.models.payment import Payment
from app.models.rating import Review
from app.models.wallet import Wallet


# ─── Reference Rates (IntraCity) ───
# base_fare, min_fare, per_km, per_min, wait/min, free_wait, passengers, luggage, p_fee_%, gst
INTRA_RATES = {
    VehicleCategory.BIKE:          (15,  25,   7,  0.75, 1.0, 3, 1, 0, 5, 5),
    VehicleCategory.SHARED:        (30,  40,   8,  1.00, 1.5, 3, 2, 1, 5, 5),
    VehicleCategory.ELECTRIC:      (45,  60,  10,  1.25, 2.0, 5, 4, 2, 5, 5),
    VehicleCategory.AUTO_RICKSHAW: (20,  30,   9,  1.00, 1.5, 5, 3, 1, 5, 5),
    VehicleCategory.HATCHBACK:     (50,  70,  12,  1.50, 2.0, 5, 4, 2, 8, 5),
    VehicleCategory.SEDAN:         (60,  90,  14,  1.75, 2.5, 5, 4, 3, 8, 5),
    VehicleCategory.SUV:           (80, 120,  16,  2.00, 3.0, 5, 6, 4, 8, 5),
    VehicleCategory.XL_SUV:        (100, 150, 18,  2.25, 3.5, 5, 7, 5, 8, 5),
    VehicleCategory.PREMIUM_SEDAN: (90,  150, 20,  2.50, 4.0, 5, 4, 3, 10, 5),
    VehicleCategory.LUXURY:        (150, 250, 25,  3.00, 5.0, 5, 4, 4, 15, 5),
}

async def seed_global_pricing(db: AsyncSession):
    print("Seeding global baseline pricing...")

    # For InterCity, multiply distance rates by ~1.3, add driver allowance
    for ride_type in [RideType.INTRACITY, RideType.INTERCITY]:
        for cat, rates in INTRA_RATES.items():
            b, m, pkm, pmin, w_min, f_wait, pax, lug, p_fee, gst = rates
            
            # InterCity adjustments
            driver_allowance = 0.0
            if ride_type == RideType.INTERCITY:
                pkm *= 1.3
                m *= 2.0
                b *= 1.5
                driver_allowance = 500.0  # Rs 500 per day driver allowance

            rate = VehicleBaseRate(
                id=uuid.uuid4(),
                name=f"Global {ride_type.value} {cat.value}",
                city_id=None,
                ride_type=ride_type,
                vehicle_category=cat,
                base_fare=b,
                minimum_fare=m,
                per_km_rate=pkm,
                per_min_rate=pmin,
                waiting_charge_per_min=w_min,
                free_waiting_min=f_wait,
                cancellation_fee=m,  # Min fare as cancellation fee
                free_cancellation_min=5,
                max_passengers=pax,
                max_luggage_pieces=lug,
                driver_allowance_per_day=driver_allowance,
                insurance_fee=5.0 if ride_type == RideType.INTERCITY else 1.0,
                platform_fee_fixed=0.0,
                platform_fee_percentage=p_fee,
                gst_percentage=gst,
                version=1,
                is_active=True,
                created_by="system-seed"
            )
            db.add(rate)
            await db.flush()

            version = PricingRuleVersion(
                id=uuid.uuid4(),
                version_tag=f"v1-GLOBAL-{ride_type.value}-{cat.value}",
                city_id=None,
                ride_type=ride_type,
                vehicle_category=cat,
                base_rate_id=rate.id,
                is_active=True,
                priority=0,
                created_by="system-seed"
            )
            db.add(version)

    await db.commit()
    print("Global pricing seeded.")

async def seed():
    async with AsyncSessionLocal() as db:
        await seed_global_pricing(db)

if __name__ == "__main__":
    asyncio.run(seed())
