from datetime import datetime
from app.services.fare_service import FareService


def test_intracity_fare_calculation():
    # Base case: 10km, 20 mins, sedan, normal hours
    result = FareService.estimate_intracity(
        distance_km=10.0,
        duration_min=20.0,
        vehicle_category="SEDAN",
        at_time=datetime(2026, 7, 17, 12, 0, 0),  # noon (non-peak)
    )

    assert result["ride_type"] == "INTRACITY"
    assert result["vehicle_category"] == "SEDAN"
    assert result["distance_km"] == 10.0
    assert result["duration_min"] == 20.0
    assert result["base_fare"] == 60.0
    # distance = 10 * 14 = 140
    # duration = 20 * 1.2 = 24
    # subtotal = 60 + 140 + 24 = 224
    assert result["distance_fare"] == 140.0
    assert result["duration_fare"] == 24.0
    assert result["surge_multiplier"] == 1.0
    assert result["surge_charge"] == 0.0
    assert result["total_fare"] == 224.0


def test_intracity_peak_surge():
    # Peak hour case: 10km, 20 mins, sedan, peak hours (8 AM)
    result = FareService.estimate_intracity(
        distance_km=10.0,
        duration_min=20.0,
        vehicle_category="SEDAN",
        at_time=datetime(2026, 7, 17, 8, 0, 0),  # peak hour
    )

    assert result["surge_multiplier"] == 1.4
    # subtotal = 224 * 1.4 = 313.6
    assert result["total_fare"] == 313.6


def test_intercity_fare_calculation():
    # Base case: 150km, sedan, daytime
    result = FareService.estimate_intercity(
        distance_km=150.0,
        duration_min=120.0,
        vehicle_category="SEDAN",
        toll_charges=150.0,
        at_time=datetime(2026, 7, 17, 12, 0, 0),
    )

    assert result["ride_type"] == "INTERCITY"
    assert result["base_fare"] == 60.0
    # distance = 150 * 14 = 2100
    # toll = 150
    # driver allowance = 300
    # night charge = 0
    # subtotal = 60 + 2100 + 300 + 150 = 2610
    # state tax = 2610 * 0.05 = 130.5
    # total = 2610 + 130.5 = 2740.5
    assert result["total_fare"] == 2740.5


def test_intercity_night_charges():
    # Night case: 150km, sedan, nighttime (11 PM)
    result = FareService.estimate_intercity(
        distance_km=150.0,
        duration_min=120.0,
        vehicle_category="SEDAN",
        toll_charges=150.0,
        at_time=datetime(2026, 7, 17, 23, 0, 0),
    )

    # subtotal before night charge = 2610
    # night charge = 2610 * 0.15 = 391.5
    # subtotal with night charge = 3001.5
    # state tax = 3001.5 * 0.05 = 150.075
    # total = 3001.5 + 150.075 = 3151.58
    assert result["night_charge"] == 391.5
    assert result["total_fare"] == 3151.58
