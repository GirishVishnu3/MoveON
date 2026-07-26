from app.repositories.booking import BookingRepository
from app.models.booking import BookingStatus
import uuid
import random
import string

class BookingService:
    def __init__(self, repo: BookingRepository):
        self.repo = repo

    def generate_booking_ref(self) -> str:
        return "BKG-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    async def create_booking(self, user_id: uuid.UUID, data: dict, preferences_id: uuid.UUID = None) -> dict:
        booking_data = {
            "booking_ref": self.generate_booking_ref(),
            "rider_id": user_id,
            "ride_type": data["ride_type"],
            "trip_type": data.get("trip_type"),
            "vehicle_category": data["vehicle_category"],
            "pickup_lat": data["pickup_lat"],
            "pickup_lon": data["pickup_lon"],
            "pickup_address": data["pickup_address"],
            "destination_lat": data["destination_lat"],
            "destination_lon": data["destination_lon"],
            "destination_address": data["destination_address"],
            "distance_km": data.get("distance_km"),
            "duration_min": data.get("duration_min"),
            "route_geometry": data.get("route_geometry"),
            "fare_estimate_id": data.get("fare_estimate_id"),
            "coupon_code": data.get("coupon_code"),
            "payment_method": data.get("payment_method", "CASH"),
            "scheduled_at": data.get("scheduled_at"),
            "return_at": data.get("return_at"),
            "preferences_id": preferences_id,
            "idempotency_key": data.get("idempotency_key"),
            "pricing_rule_version_id": data.get("fare_breakdown", {}).get("pricing_rule_version_id") if data.get("fare_breakdown") else None,
            "status": BookingStatus.SEARCHING
        }
        return await self.repo.create_booking(booking_data)
