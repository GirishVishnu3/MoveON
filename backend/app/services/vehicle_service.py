from app.models.booking import RideType, VehicleCategory
from typing import List, Dict, Any

class VehicleService:
    @staticmethod
    def get_available_vehicles(ride_type: RideType, lat: float, lon: float) -> List[Dict[str, Any]]:
        # This acts as the catalog of supported vehicles based on the ride type.
        # In a fully deployed system, ETAs would be computed dynamically from online drivers nearby.

        # Base UI attributes for ALL vehicle types (keyed by category enum value string)
        ui_attributes: Dict[str, Dict] = {
            "BIKE": {
                "icon": "bike", "comfort": "Basic", "seats": 1, "luggage": "None",
                "fuel_type": "Petrol", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY"],
            },
            "AUTO_RICKSHAW": {
                "icon": "auto", "comfort": "Basic", "seats": 3, "luggage": "Small",
                "fuel_type": "CNG", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY"],
            },
            "HATCHBACK": {
                "icon": "hatchback", "comfort": "Standard", "seats": 4, "luggage": "Medium",
                "fuel_type": "Petrol/CNG", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY", "INTERCITY"],
            },
            "SEDAN": {
                "icon": "sedan", "comfort": "Comfortable", "seats": 4, "luggage": "Large",
                "fuel_type": "Diesel", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY", "INTERCITY"],
            },
            "SUV": {
                "icon": "suv", "comfort": "Premium", "seats": 6, "luggage": "Large",
                "fuel_type": "Diesel", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY", "INTERCITY"],
            },
            "XL_SUV": {
                "icon": "xl_suv", "comfort": "Premium", "seats": 7, "luggage": "Extra Large",
                "fuel_type": "Diesel", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTERCITY"],
            },
            "PREMIUM_SEDAN": {
                "icon": "premium_sedan", "comfort": "Luxury", "seats": 4, "luggage": "Large",
                "fuel_type": "Diesel/Electric", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY", "INTERCITY"],
            },
            "LUXURY": {
                "icon": "luxury", "comfort": "Luxury", "seats": 4, "luggage": "Large",
                "fuel_type": "Diesel/Hybrid", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY", "INTERCITY"],
            },
            "ELECTRIC": {
                "icon": "electric", "comfort": "Comfortable", "seats": 4, "luggage": "Medium",
                "fuel_type": "Electric", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY"],
            },
            "SHARED": {
                "icon": "shared", "comfort": "Standard", "seats": 3, "luggage": "Small",
                "fuel_type": "CNG/Petrol", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY"],
            },
            "RENTAL": {
                "icon": "suv", "comfort": "Standard", "seats": 4, "luggage": "Medium",
                "fuel_type": "Petrol/Diesel", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTRACITY"],
            },
            "OUTSTATION_CAB": {
                "icon": "sedan", "comfort": "Comfortable", "seats": 4, "luggage": "Large",
                "fuel_type": "Diesel", "cancellation_policy": "Free cancellation within 1 min",
                "ride_types": ["INTERCITY"],
            },
        }

        if ride_type == RideType.INTRACITY:
            vehicles = [
                {"category": "BIKE",           "display_name": "Bike",          "eta_min": 3,  "eta_max": 5},
                {"category": "AUTO_RICKSHAW",  "display_name": "Auto",          "eta_min": 5,  "eta_max": 8},
                {"category": "SEDAN",          "display_name": "Sedan (4 Seats)", "eta_min": 8,  "eta_max": 12},
                {"category": "SUV",            "display_name": "SUV (6 Seats)",   "eta_min": 10, "eta_max": 15},
            ]
        elif ride_type == RideType.INTERCITY:
            vehicles = [
                {"category": "HATCHBACK",      "display_name": "Mini (Outstation)",      "eta_min": 15, "eta_max": 25},
                {"category": "SEDAN",          "display_name": "Sedan (Outstation)",     "eta_min": 20, "eta_max": 30},
                {"category": "SUV",            "display_name": "SUV (Outstation)",       "eta_min": 30, "eta_max": 45},
                {"category": "XL_SUV",         "display_name": "XL SUV (Outstation)",   "eta_min": 45, "eta_max": 60},
                {"category": "PREMIUM_SEDAN",  "display_name": "Prime Sedan (Outstation)", "eta_min": 25, "eta_max": 40},
                {"category": "LUXURY",         "display_name": "Luxury (Outstation)",   "eta_min": 45, "eta_max": 60},
                {"category": "OUTSTATION_CAB", "display_name": "Outstation Cab",         "eta_min": 30, "eta_max": 50},
            ]
        else:
            return []

        result = []
        for v in vehicles:
            cat = v["category"]
            attrs = ui_attributes.get(cat, ui_attributes["SEDAN"])
            full_v = {
                **v,
                **attrs,
                "eta_display": f"{v['eta_min']}-{v['eta_max']} min",
            }
            result.append(full_v)

        return result
