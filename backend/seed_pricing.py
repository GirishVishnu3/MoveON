"""
seed_pricing.py
Seeds default global pricing rules for all vehicle categories and both ride types.
Run once:  python seed_pricing.py
Safe to re-run — skips if data already exists.
"""
import asyncio
from app.database.database import AsyncSessionLocal
from app.models.pricing import City, VehicleBaseRate, PeakHourRule, SurgeRule, PricingRuleVersion
from app.models.booking import RideType, VehicleCategory
from sqlalchemy import select
import uuid
from datetime import datetime

# ── Default base rates (INR / Global rules) ─────────────────────────────────
# Calibrated against Ola, Uber India & Rapido market benchmarks
VEHICLE_RATES = {
    # (vehicle_category, ride_type) -> dict of rate fields
    (VehicleCategory.BIKE, RideType.INTRACITY): {
        "base_fare": 20.0, "minimum_fare": 30.0, "per_km_rate": 8.0,
        "per_min_rate": 0.5, "gst_percentage": 5.0, "platform_fee_fixed": 3.0,
        "max_passengers": 1,
    },
    (VehicleCategory.SCOOTER, RideType.INTRACITY): {
        "base_fare": 22.0, "minimum_fare": 32.0, "per_km_rate": 8.5,
        "per_min_rate": 0.5, "gst_percentage": 5.0, "platform_fee_fixed": 3.0,
        "max_passengers": 1,
    },
    (VehicleCategory.AUTO_RICKSHAW, RideType.INTRACITY): {
        "base_fare": 30.0, "minimum_fare": 40.0, "per_km_rate": 13.0,
        "per_min_rate": 0.8, "gst_percentage": 5.0, "platform_fee_fixed": 5.0,
        "max_passengers": 3,
    },
    (VehicleCategory.HATCHBACK, RideType.INTRACITY): {
        "base_fare": 40.0, "minimum_fare": 70.0, "per_km_rate": 13.5,
        "per_min_rate": 1.0, "gst_percentage": 5.0, "platform_fee_fixed": 6.0,
        "max_passengers": 4,
    },
    (VehicleCategory.SEDAN, RideType.INTRACITY): {
        "base_fare": 45.0, "minimum_fare": 80.0, "per_km_rate": 15.0,
        "per_min_rate": 1.2, "gst_percentage": 5.0, "platform_fee_fixed": 8.0,
        "max_passengers": 4,
    },
    (VehicleCategory.SUV, RideType.INTRACITY): {
        "base_fare": 75.0, "minimum_fare": 130.0, "per_km_rate": 20.0,
        "per_min_rate": 1.8, "gst_percentage": 5.0, "platform_fee_fixed": 12.0,
        "max_passengers": 6,
    },
    (VehicleCategory.XL_SUV, RideType.INTRACITY): {
        "base_fare": 95.0, "minimum_fare": 160.0, "per_km_rate": 23.0,
        "per_min_rate": 2.0, "gst_percentage": 5.0, "platform_fee_fixed": 15.0,
        "max_passengers": 7,
    },
    (VehicleCategory.PREMIUM_SEDAN, RideType.INTRACITY): {
        "base_fare": 110.0, "minimum_fare": 180.0, "per_km_rate": 25.0,
        "per_min_rate": 2.2, "gst_percentage": 5.0, "platform_fee_fixed": 18.0,
        "max_passengers": 4,
    },
    (VehicleCategory.LUXURY, RideType.INTRACITY): {
        "base_fare": 200.0, "minimum_fare": 300.0, "per_km_rate": 35.0,
        "per_min_rate": 3.0, "gst_percentage": 5.0, "platform_fee_fixed": 25.0,
        "max_passengers": 4,
    },
    (VehicleCategory.ELECTRIC, RideType.INTRACITY): {
        "base_fare": 40.0, "minimum_fare": 70.0, "per_km_rate": 13.5,
        "per_min_rate": 1.0, "gst_percentage": 5.0, "platform_fee_fixed": 6.0,
        "max_passengers": 4,
    },
    (VehicleCategory.SHARED, RideType.INTRACITY): {
        "base_fare": 15.0, "minimum_fare": 25.0, "per_km_rate": 5.0,
        "per_min_rate": 0.3, "gst_percentage": 5.0, "platform_fee_fixed": 3.0,
        "max_passengers": 4,
    },
    # ─── InterCity (India) ──────────────────────────────────────────────────
    (VehicleCategory.BIKE, RideType.INTERCITY): {
        "base_fare": 80.0, "minimum_fare": 120.0, "per_km_rate": 6.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 10.0,
        "max_passengers": 1, "driver_allowance_per_day": 250.0,
    },
    (VehicleCategory.AUTO_RICKSHAW, RideType.INTERCITY): {
        "base_fare": 120.0, "minimum_fare": 180.0, "per_km_rate": 9.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 15.0,
        "max_passengers": 3, "driver_allowance_per_day": 350.0,
    },
    (VehicleCategory.HATCHBACK, RideType.INTERCITY): {
        "base_fare": 180.0, "minimum_fare": 280.0, "per_km_rate": 11.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 20.0,
        "max_passengers": 4, "driver_allowance_per_day": 400.0,
    },
    (VehicleCategory.SEDAN, RideType.INTERCITY): {
        "base_fare": 220.0, "minimum_fare": 350.0, "per_km_rate": 13.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 25.0,
        "max_passengers": 4, "driver_allowance_per_day": 500.0,
    },
    (VehicleCategory.SUV, RideType.INTERCITY): {
        "base_fare": 320.0, "minimum_fare": 480.0, "per_km_rate": 17.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 35.0,
        "max_passengers": 6, "driver_allowance_per_day": 600.0,
    },
    (VehicleCategory.XL_SUV, RideType.INTERCITY): {
        "base_fare": 400.0, "minimum_fare": 600.0, "per_km_rate": 20.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 45.0,
        "max_passengers": 7, "driver_allowance_per_day": 700.0,
    },
    (VehicleCategory.PREMIUM_SEDAN, RideType.INTERCITY): {
        "base_fare": 450.0, "minimum_fare": 650.0, "per_km_rate": 22.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 50.0,
        "max_passengers": 4, "driver_allowance_per_day": 850.0,
    },
    (VehicleCategory.LUXURY, RideType.INTERCITY): {
        "base_fare": 700.0, "minimum_fare": 1100.0, "per_km_rate": 32.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 80.0,
        "max_passengers": 4, "driver_allowance_per_day": 1200.0,
    },
    (VehicleCategory.OUTSTATION_CAB, RideType.INTERCITY): {
        "base_fare": 250.0, "minimum_fare": 400.0, "per_km_rate": 14.0,
        "per_min_rate": 0.0, "gst_percentage": 5.0, "platform_fee_fixed": 30.0,
        "max_passengers": 4, "driver_allowance_per_day": 550.0,
    },
}

# ── UK Specific Vehicle Base Rates (GBP) ──────────────────────────────────
# Calibrated against UK market rates (Uber UK & Bolt UK benchmarks)
UK_VEHICLE_RATES = {
    # Intracity
    (VehicleCategory.HATCHBACK, RideType.INTRACITY): {
        "base_fare": 1.20, "minimum_fare": 4.00, "per_km_rate": 0.80,
        "per_min_rate": 0.10, "gst_percentage": 0.0, "platform_fee_fixed": 0.40,
        "max_passengers": 4,
    },
    (VehicleCategory.SEDAN, RideType.INTRACITY): {
        "base_fare": 1.50, "minimum_fare": 4.50, "per_km_rate": 0.90,
        "per_min_rate": 0.12, "gst_percentage": 0.0, "platform_fee_fixed": 0.50,
        "max_passengers": 4,
    },
    (VehicleCategory.SUV, RideType.INTRACITY): {
        "base_fare": 2.40, "minimum_fare": 7.20, "per_km_rate": 1.40,
        "per_min_rate": 0.20, "gst_percentage": 0.0, "platform_fee_fixed": 0.80,
        "max_passengers": 6,
    },
    (VehicleCategory.XL_SUV, RideType.INTRACITY): {
        "base_fare": 3.00, "minimum_fare": 9.00, "per_km_rate": 1.70,
        "per_min_rate": 0.24, "gst_percentage": 0.0, "platform_fee_fixed": 1.00,
        "max_passengers": 7,
    },
    (VehicleCategory.PREMIUM_SEDAN, RideType.INTRACITY): {
        "base_fare": 2.20, "minimum_fare": 6.50, "per_km_rate": 1.20,
        "per_min_rate": 0.18, "gst_percentage": 0.0, "platform_fee_fixed": 0.70,
        "max_passengers": 4,
    },
    (VehicleCategory.LUXURY, RideType.INTRACITY): {
        "base_fare": 3.50, "minimum_fare": 10.00, "per_km_rate": 1.85,
        "per_min_rate": 0.30, "gst_percentage": 0.0, "platform_fee_fixed": 1.20,
        "max_passengers": 4,
    },
    (VehicleCategory.ELECTRIC, RideType.INTRACITY): {
        "base_fare": 1.40, "minimum_fare": 4.40, "per_km_rate": 0.88,
        "per_min_rate": 0.12, "gst_percentage": 0.0, "platform_fee_fixed": 0.50,
        "max_passengers": 4,
    },
    (VehicleCategory.SHARED, RideType.INTRACITY): {
        "base_fare": 1.00, "minimum_fare": 3.20, "per_km_rate": 0.65,
        "per_min_rate": 0.08, "gst_percentage": 0.0, "platform_fee_fixed": 0.30,
        "max_passengers": 4,
    },
    # Intercity
    (VehicleCategory.HATCHBACK, RideType.INTERCITY): {
        "base_fare": 15.0, "minimum_fare": 30.0, "per_km_rate": 1.00,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 2.5,
        "max_passengers": 4, "driver_allowance_per_day": 35.0,
    },
    (VehicleCategory.SEDAN, RideType.INTERCITY): {
        "base_fare": 20.0, "minimum_fare": 40.0, "per_km_rate": 1.15,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 3.0,
        "max_passengers": 4, "driver_allowance_per_day": 45.0,
    },
    (VehicleCategory.SUV, RideType.INTERCITY): {
        "base_fare": 30.0, "minimum_fare": 55.0, "per_km_rate": 1.45,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 4.0,
        "max_passengers": 6, "driver_allowance_per_day": 55.0,
    },
    (VehicleCategory.XL_SUV, RideType.INTERCITY): {
        "base_fare": 38.0, "minimum_fare": 70.0, "per_km_rate": 1.80,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 5.0,
        "max_passengers": 7, "driver_allowance_per_day": 65.0,
    },
    (VehicleCategory.PREMIUM_SEDAN, RideType.INTERCITY): {
        "base_fare": 45.0, "minimum_fare": 80.0, "per_km_rate": 2.00,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 6.0,
        "max_passengers": 4, "driver_allowance_per_day": 80.0,
    },
    (VehicleCategory.LUXURY, RideType.INTERCITY): {
        "base_fare": 70.0, "minimum_fare": 130.0, "per_km_rate": 2.80,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 10.0,
        "max_passengers": 4, "driver_allowance_per_day": 100.0,
    },
    (VehicleCategory.OUTSTATION_CAB, RideType.INTERCITY): {
        "base_fare": 25.0, "minimum_fare": 45.0, "per_km_rate": 1.25,
        "per_min_rate": 0.0, "gst_percentage": 0.0, "platform_fee_fixed": 4.0,
        "max_passengers": 4, "driver_allowance_per_day": 45.0,
    },
}

CITIES_DATA = [
    # India (INR)
    {"name": "Bengaluru", "state": "Karnataka", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 12.9716, "lon_center": 77.5946, "radius_km": 60.0},
    {"name": "Mumbai", "state": "Maharashtra", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 19.0760, "lon_center": 72.8777, "radius_km": 50.0},
    {"name": "Delhi NCR", "state": "Delhi", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 28.6139, "lon_center": 77.2090, "radius_km": 70.0},
    {"name": "Hyderabad", "state": "Telangana", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 17.3850, "lon_center": 78.4867, "radius_km": 50.0},
    {"name": "Chennai", "state": "Tamil Nadu", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 13.0827, "lon_center": 80.2707, "radius_km": 50.0},
    {"name": "Kolkata", "state": "West Bengal", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 22.5726, "lon_center": 88.3639, "radius_km": 50.0},
    {"name": "Pune", "state": "Maharashtra", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 18.5204, "lon_center": 73.8567, "radius_km": 40.0},
    {"name": "Ahmedabad", "state": "Gujarat", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 23.0225, "lon_center": 72.5714, "radius_km": 40.0},
    {"name": "Jaipur", "state": "Rajasthan", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 26.9124, "lon_center": 75.7873, "radius_km": 40.0},
    {"name": "Kochi", "state": "Kerala", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 9.9312, "lon_center": 76.2673, "radius_km": 40.0},
    {"name": "Vizag", "state": "Andhra Pradesh", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 17.6868, "lon_center": 83.2185, "radius_km": 40.0},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "country": "India", "currency": "INR", "timezone": "Asia/Kolkata", "lat_center": 16.5062, "lon_center": 80.6480, "radius_km": 40.0},
    # United Kingdom (GBP)
    {"name": "London", "state": "Greater London", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 51.5074, "lon_center": -0.1278, "radius_km": 60.0},
    {"name": "Manchester", "state": "Greater Manchester", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 53.4808, "lon_center": -2.2426, "radius_km": 40.0},
    {"name": "Birmingham", "state": "West Midlands", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 52.4862, "lon_center": -1.8904, "radius_km": 40.0},
    {"name": "Leeds", "state": "West Yorkshire", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 53.8008, "lon_center": -1.5491, "radius_km": 40.0},
    {"name": "Glasgow", "state": "Scotland", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 55.8642, "lon_center": -4.2518, "radius_km": 40.0},
    {"name": "Edinburgh", "state": "Scotland", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 55.9533, "lon_center": -3.1883, "radius_km": 40.0},
    {"name": "Bristol", "state": "South West", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 51.4545, "lon_center": -2.5879, "radius_km": 40.0},
    {"name": "Liverpool", "state": "Merseyside", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 53.4084, "lon_center": -2.9916, "radius_km": 40.0},
    {"name": "Newcastle", "state": "Tyne and Wear", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 54.9783, "lon_center": -1.6178, "radius_km": 40.0},
    {"name": "Sheffield", "state": "South Yorkshire", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 53.3811, "lon_center": -1.4701, "radius_km": 40.0},
    {"name": "Nottingham", "state": "Nottinghamshire", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 52.9548, "lon_center": -1.1581, "radius_km": 40.0},
    {"name": "Cambridge", "state": "Cambridgeshire", "country": "United Kingdom", "currency": "GBP", "timezone": "Europe/London", "lat_center": 52.2053, "lon_center": 0.1218, "radius_km": 30.0},
]

VEHICLE_DISPLAY_NAMES = {
    VehicleCategory.BIKE:          "Bike",
    VehicleCategory.SCOOTER:       "Scooter",
    VehicleCategory.AUTO_RICKSHAW: "Auto Rickshaw",
    VehicleCategory.HATCHBACK:     "Hatchback",
    VehicleCategory.SEDAN:         "Sedan",
    VehicleCategory.SUV:           "SUV",
    VehicleCategory.XL_SUV:        "XL SUV",
    VehicleCategory.PREMIUM_SEDAN: "Premium Sedan",
    VehicleCategory.LUXURY:        "Luxury",
    VehicleCategory.ELECTRIC:      "Electric",
    VehicleCategory.SHARED:        "Shared",
    VehicleCategory.OUTSTATION_CAB:"Outstation Cab",
    VehicleCategory.RENTAL:        "Rental",
}


async def seed():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()

        # 1. Seed Cities if not present
        existing_cities_res = await db.execute(select(City))
        existing_city_names = {c.name for c in existing_cities_res.scalars().all()}
        cities_by_name = {}

        for c_data in CITIES_DATA:
            if c_data["name"] not in existing_city_names:
                city_obj = City(
                    id=uuid.uuid4(),
                    name=c_data["name"],
                    state=c_data["state"],
                    country=c_data["country"],
                    timezone=c_data["timezone"],
                    currency=c_data["currency"],
                    lat_center=c_data["lat_center"],
                    lon_center=c_data["lon_center"],
                    radius_km=c_data["radius_km"],
                    is_active=True,
                    created_at=now,
                )
                db.add(city_obj)
                cities_by_name[c_data["name"]] = city_obj
                print(f"  🏙️ Seeded city: {c_data['name']} ({c_data['country']} - {c_data['currency']})")
        await db.flush()

        # Re-fetch all cities
        all_cities = (await db.execute(select(City))).scalars().all()
        for c in all_cities:
            cities_by_name[c.name] = c

        # 2. Check if global rules are seeded
        existing_global = (await db.execute(select(PricingRuleVersion).where(PricingRuleVersion.city_id == None).limit(1))).scalars().first()
        if not existing_global:
            print("🌱 Seeding default global (India/INR) pricing rules...")
            peak_rule = PeakHourRule(
                id=uuid.uuid4(),
                name="Global Default Peak Hours",
                city_id=None,
                ride_type=None,
                peak_start_hour=8, peak_start_minute=0,
                peak_end_hour=10, peak_end_minute=0,
                peak_hour_multiplier=1.2,
                evening_start_hour=17, evening_start_minute=0,
                evening_end_hour=20, evening_end_minute=0,
                evening_multiplier=1.15,
                night_start_hour=22, night_end_hour=5,
                night_charge_multiplier=1.25,
                holiday_multiplier=1.3,
                festival_multiplier=1.4,
                priority=0,
                is_active=True,
                version=1,
                created_at=now,
                created_by="seed_script",
            )
            db.add(peak_rule)
            await db.flush()

            surge_rule = SurgeRule(
                id=uuid.uuid4(),
                name="Global Default Surge",
                city_id=None,
                ride_type=None,
                vehicle_category=None,
                current_multiplier=1.0,
                min_multiplier=1.0,
                max_multiplier=3.0,
                is_active=True,
                created_at=now,
                created_by="seed_script",
            )
            db.add(surge_rule)
            await db.flush()

            for (vehicle_cat, ride_type), rate_fields in VEHICLE_RATES.items():
                display = VEHICLE_DISPLAY_NAMES.get(vehicle_cat, vehicle_cat.value)
                tag = f"v1-{vehicle_cat.value}-{ride_type.value}-GLOBAL"

                base_rate = VehicleBaseRate(
                    id=uuid.uuid4(),
                    name=f"{display} {ride_type.value.title()} (Global Default)",
                    city_id=None,
                    ride_type=ride_type,
                    vehicle_category=vehicle_cat,
                    base_fare=rate_fields.get("base_fare", 0),
                    minimum_fare=rate_fields.get("minimum_fare", 0),
                    per_km_rate=rate_fields.get("per_km_rate", 0),
                    per_min_rate=rate_fields.get("per_min_rate", 0),
                    waiting_charge_per_min=rate_fields.get("waiting_charge_per_min", 1.0),
                    free_waiting_min=rate_fields.get("free_waiting_min", 5),
                    cancellation_fee=rate_fields.get("cancellation_fee", 50.0),
                    free_cancellation_min=rate_fields.get("free_cancellation_min", 5),
                    max_passengers=rate_fields.get("max_passengers", 4),
                    max_luggage_pieces=rate_fields.get("max_luggage_pieces", 2),
                    airport_pickup_charge=rate_fields.get("airport_pickup_charge", 0),
                    airport_drop_charge=rate_fields.get("airport_drop_charge", 0),
                    driver_allowance_per_day=rate_fields.get("driver_allowance_per_day", 0),
                    insurance_fee=rate_fields.get("insurance_fee", 5.0),
                    platform_fee_fixed=rate_fields.get("platform_fee_fixed", 10.0),
                    platform_fee_percentage=rate_fields.get("platform_fee_percentage", 0),
                    gst_percentage=rate_fields.get("gst_percentage", 5.0),
                    version=1,
                    is_active=True,
                    effective_from=now,
                    created_at=now,
                    created_by="seed_script",
                    notes="Auto-seeded default global rate",
                )
                db.add(base_rate)
                await db.flush()

                rule_version = PricingRuleVersion(
                    id=uuid.uuid4(),
                    version_tag=tag,
                    city_id=None,
                    ride_type=ride_type,
                    vehicle_category=vehicle_cat,
                    base_rate_id=base_rate.id,
                    peak_rule_id=peak_rule.id,
                    surge_rule_id=surge_rule.id,
                    weather_rule_id=None,
                    toll_rule_id=None,
                    is_active=True,
                    priority=0,
                    effective_from=now,
                    created_at=now,
                    created_by="seed_script",
                    notes="Auto-seeded default global rule version",
                )
                db.add(rule_version)

        # 3. Seed UK Pricing Rules for London (acts as UK baseline)
        london_city = cities_by_name.get("London")
        if london_city:
            existing_london_rule = (await db.execute(
                select(PricingRuleVersion).where(PricingRuleVersion.city_id == london_city.id).limit(1)
            )).scalars().first()

            if not existing_london_rule:
                print("🇬🇧 Seeding UK/London (GBP) pricing rules (strictly no Bike or Auto Rickshaw)...")
                uk_peak = PeakHourRule(
                    id=uuid.uuid4(),
                    name="UK Default Peak Hours",
                    city_id=london_city.id,
                    ride_type=None,
                    peak_start_hour=7, peak_start_minute=30,
                    peak_end_hour=9, peak_end_minute=30,
                    peak_hour_multiplier=1.25,
                    evening_start_hour=16, evening_start_minute=30,
                    evening_end_hour=19, evening_end_minute=0,
                    evening_multiplier=1.2,
                    night_start_hour=23, night_end_hour=5,
                    night_charge_multiplier=1.3,
                    priority=1,
                    is_active=True,
                    version=1,
                    created_at=now,
                    created_by="seed_script",
                )
                db.add(uk_peak)
                await db.flush()

                uk_surge = SurgeRule(
                    id=uuid.uuid4(),
                    name="UK Default Surge",
                    city_id=london_city.id,
                    ride_type=None,
                    vehicle_category=None,
                    current_multiplier=1.0,
                    min_multiplier=1.0,
                    max_multiplier=3.0,
                    is_active=True,
                    created_at=now,
                    created_by="seed_script",
                )
                db.add(uk_surge)
                await db.flush()

                for (vehicle_cat, ride_type), rate_fields in UK_VEHICLE_RATES.items():
                    display = VEHICLE_DISPLAY_NAMES.get(vehicle_cat, vehicle_cat.value)
                    tag = f"v1-{vehicle_cat.value}-{ride_type.value}-UK-GBP"

                    base_rate = VehicleBaseRate(
                        id=uuid.uuid4(),
                        name=f"{display} {ride_type.value.title()} (UK GBP)",
                        city_id=london_city.id,
                        ride_type=ride_type,
                        vehicle_category=vehicle_cat,
                        base_fare=rate_fields.get("base_fare", 0),
                        minimum_fare=rate_fields.get("minimum_fare", 0),
                        per_km_rate=rate_fields.get("per_km_rate", 0),
                        per_min_rate=rate_fields.get("per_min_rate", 0),
                        waiting_charge_per_min=0.35,
                        free_waiting_min=5,
                        cancellation_fee=5.0,
                        free_cancellation_min=5,
                        max_passengers=rate_fields.get("max_passengers", 4),
                        max_luggage_pieces=rate_fields.get("max_luggage_pieces", 2),
                        airport_pickup_charge=5.0,
                        airport_drop_charge=3.0,
                        driver_allowance_per_day=rate_fields.get("driver_allowance_per_day", 0),
                        insurance_fee=0.5,
                        platform_fee_fixed=rate_fields.get("platform_fee_fixed", 1.0),
                        platform_fee_percentage=0,
                        gst_percentage=rate_fields.get("gst_percentage", 20.0), # UK VAT 20%
                        version=1,
                        is_active=True,
                        effective_from=now,
                        created_at=now,
                        created_by="seed_script",
                        notes="Auto-seeded UK GBP rate",
                    )
                    db.add(base_rate)
                    await db.flush()

                    rule_version = PricingRuleVersion(
                        id=uuid.uuid4(),
                        version_tag=tag,
                        city_id=london_city.id,
                        ride_type=ride_type,
                        vehicle_category=vehicle_cat,
                        base_rate_id=base_rate.id,
                        peak_rule_id=uk_peak.id,
                        surge_rule_id=uk_surge.id,
                        weather_rule_id=None,
                        toll_rule_id=None,
                        is_active=True,
                        priority=1, # higher than global priority 0
                        effective_from=now,
                        created_at=now,
                        created_by="seed_script",
                        notes="Auto-seeded UK GBP rule version",
                    )
                    db.add(rule_version)
                    print(f"  ✔ UK {display} {ride_type.value} (£{rate_fields.get('base_fare')} base)")

        await db.commit()
        print("\n✅ Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())

