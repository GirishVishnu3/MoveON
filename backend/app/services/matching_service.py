from app.models.driver import DriverStatus
from app.services.driver_search_service import haversine
from typing import List

class MatchingService:
    def rank_drivers(self, pickup_lat: float, pickup_lon: float, drivers: List[DriverStatus]) -> List[DriverStatus]:
        """
        Ranks drivers based on a composite score.
        Score = (Distance * w_dist) - (Rating * w_rating) - (AcceptanceRate * w_acc)
        Lower score is better.
        """
        def calculate_score(driver: DriverStatus):
            dist = haversine(pickup_lat, pickup_lon, driver.lat, driver.lon)
            
            # Weights
            w_dist = 1.0     # Distance is primary factor
            w_rating = 0.5   # 5.0 rating = -2.5 score
            w_acc = 1.0      # 1.0 acceptance = -1.0 score
            
            # Penalize low rating or low acceptance
            score = (dist * w_dist) - (driver.rating * w_rating) - (driver.acceptance_rate * w_acc)
            return score

        return sorted(drivers, key=calculate_score)
