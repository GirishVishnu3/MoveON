import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# We need a mock token to test protected routes. 
# We'll see if the router requires it properly.
print("Testing /health")
response = client.get("/health")
assert response.status_code == 200, "Health check failed"
print("Health check OK")

print("Testing /booking/estimate")
response = client.post("/booking/estimate", json={
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
else:
    data = response.json()
    assert "estimate" in data, "No estimate in response"
    assert "vehicles" in data, "No vehicles in response"
    print("Estimate OK")

print("Testing unauthenticated /booking/confirm")
response = client.post("/booking/confirm", json={
    "ride_type": "INTERCITY",
    "vehicle_category": "SUV",
    "pickup_lat": 12.9716,
    "pickup_lon": 77.5946,
    "destination_lat": 13.0827,
    "destination_lon": 80.2707,
    "pickup_address": "Bengaluru",
    "destination_address": "Chennai"
})
# Should return 403 or 401 because get_current_user requires a token
if response.status_code in [401, 403]:
    print(f"Confirm unauthenticated rejected properly ({response.status_code})")
else:
    print(f"Warning: /confirm returned {response.status_code}")

print("Done with basic endpoint tests")
