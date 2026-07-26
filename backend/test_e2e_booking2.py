import requests
import time
import subprocess
import os

print("Starting backend server for testing...")
proc = subprocess.Popen(["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8089"], cwd="/Users/girishvishnu/Desktop/MoveON/backend")
time.sleep(3) # Wait for server to start

try:
    print("Testing /health")
    response = requests.get("http://127.0.0.1:8089/health")
    assert response.status_code == 200, "Health check failed"
    print("Health check OK")

    print("Testing /booking/estimate")
    response = requests.post("http://127.0.0.1:8089/booking/estimate", json={
        "ride_type": "INTERCITY",
        "vehicle_category": "SUV",
        "pickup_lat": 12.9716,
        "pickup_lon": 77.5946,
        "destination_lat": 13.0827,
        "destination_lon": 80.2707,
        "pickup_address": "Bengaluru",
        "destination_address": "Chennai",
        "distance_km": 350.5,
        "duration_min": 300
    })
    print(f"Estimate status: {response.status_code}")
    if response.status_code != 200:
        print(response.json())
        assert False, "Estimate failed"
    else:
        data = response.json()
        assert "estimate" in data, "No estimate in response"
        assert "vehicles" in data, "No vehicles in response"
        print("Estimate OK")

    print("Testing unauthenticated /booking/confirm")
    response = requests.post("http://127.0.0.1:8089/booking/confirm", json={
        "ride_type": "INTERCITY",
        "vehicle_category": "SUV",
        "pickup_lat": 12.9716,
        "pickup_lon": 77.5946,
        "destination_lat": 13.0827,
        "destination_lon": 80.2707,
        "pickup_address": "Bengaluru",
        "destination_address": "Chennai"
    })
    if response.status_code in [401, 403]:
        print(f"Confirm unauthenticated rejected properly ({response.status_code})")
    else:
        print(f"Warning: /confirm returned {response.status_code}")
        assert False, "Unauthenticated confirm didn't return 401/403"

    print("ALL API ENDPOINTS PASSED VERIFICATION")

finally:
    proc.terminate()
