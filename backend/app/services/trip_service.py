import uuid
from typing import Optional, Tuple
from datetime import datetime
from app.models.booking import Booking, BookingStatus
from app.repositories.booking import BookingRepository
from app.repositories.trip import TripRepository
from app.services.driver_search_service import haversine


class TripService:
    # Define valid transitions
    VALID_TRANSITIONS = {
        BookingStatus.DRIVER_ASSIGNED: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
        BookingStatus.DRIVER_EN_ROUTE: [BookingStatus.DRIVER_ARRIVED, BookingStatus.CANCELLED, BookingStatus.SOS_ACTIVE],
        BookingStatus.DRIVER_ARRIVED: [BookingStatus.PASSENGER_ONBOARDED, BookingStatus.TRIP_STARTED, BookingStatus.CANCELLED],
        BookingStatus.PASSENGER_ONBOARDED: [BookingStatus.TRIP_STARTED, BookingStatus.CANCELLED],
        BookingStatus.TRIP_STARTED: [BookingStatus.TRIP_IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.SOS_ACTIVE],
        BookingStatus.TRIP_IN_PROGRESS: [BookingStatus.STOP_ADDED, BookingStatus.COMPLETED, BookingStatus.SOS_ACTIVE],
        BookingStatus.STOP_ADDED: [BookingStatus.TRIP_IN_PROGRESS, BookingStatus.COMPLETED],
        BookingStatus.SOS_ACTIVE: [BookingStatus.TRIP_IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.COMPLETED],
    }

    def __init__(self, booking_repo: BookingRepository, trip_repo: TripRepository):
        self.booking_repo = booking_repo
        self.trip_repo = trip_repo

    async def update_trip_status(
        self, booking_ref: str, new_status: BookingStatus, user_id: str, is_driver: bool
    ) -> Tuple[bool, Optional[Booking], str]:
        booking = await self.booking_repo.get_booking_by_ref(booking_ref)
        if not booking:
            return False, None, "Booking not found"
        
        # Check authorization (Driver updating their trip, or Rider updating theirs)
        if is_driver and str(booking.driver_id) != user_id:
            return False, booking, "Not authorized as the assigned driver"
        if not is_driver and str(booking.rider_id) != user_id:
            return False, booking, "Not authorized as the rider"
            
        current_status = booking.status
        allowed_next_states = self.VALID_TRANSITIONS.get(current_status, [])
        
        if new_status not in allowed_next_states:
            return False, booking, f"Invalid transition from {current_status.value} to {new_status.value}"

        updated_booking = await self.booking_repo.update_booking_status_by_ref(
            booking_ref, new_status, reason=f"Status updated by {'driver' if is_driver else 'rider'} {user_id}"
        )
        return True, updated_booking, "Success"

    async def process_location_update(self, booking_ref: str, driver_id: str, lat: float, lon: float, speed: float = None, heading: float = None, accuracy: float = None):
        """
        Process GPS location update, filter out invalid/stale coordinates, and save to LocationHistory.
        """
        booking = await self.booking_repo.get_booking_by_ref(booking_ref)
        if not booking or str(booking.driver_id) != driver_id:
            raise ValueError("Invalid booking or unauthorized driver")
            
        # Basic GPS validation
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            raise ValueError("Invalid GPS coordinates")
            
        # Check against last location to prevent duplicates or unrealistic jumps (optional filtering)
        recent_locs = await self.trip_repo.get_recent_locations(booking.id, limit=1)
        if recent_locs:
            last_loc = recent_locs[0]
            # If accuracy is very bad, we might skip
            if accuracy and accuracy > 100:
                pass # Depending on strictness, we could return early here
                
            dist = haversine(last_loc.lat, last_loc.lon, lat, lon)
            # If distance is < 1 meter, it's essentially a duplicate
            if dist < 0.001:
                return last_loc
                
        loc_data = {
            "booking_id": booking.id,
            "driver_id": driver_id,
            "lat": lat,
            "lon": lon,
            "speed": speed,
            "heading": heading,
            "accuracy": accuracy,
        }
        loc = await self.trip_repo.save_location(loc_data)
        
        # We could also compute remaining ETA here using haversine and current speed 
        # (or OSRM if available) and return it.
        return loc

    @staticmethod
    def calculate_eta_mock(current_lat: float, current_lon: float, target_lat: float, target_lon: float, avg_speed_kmh: float = 30.0) -> Tuple[float, int]:
        """
        Mocks an ETA based on haversine distance and an average speed in km/h.
        Returns (distance_km, eta_minutes)
        """
        dist_km = haversine(current_lat, current_lon, target_lat, target_lon)
        # Apply a route multiplier since roads aren't straight lines (typically 1.3 - 1.5)
        dist_km *= 1.4 
        
        hours = dist_km / max(avg_speed_kmh, 1.0)
        minutes = int(hours * 60)
        return dist_km, max(minutes, 1)
