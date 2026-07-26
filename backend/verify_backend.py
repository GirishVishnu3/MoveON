import sys
import traceback

def verify():
    try:
        from app.models.booking import Booking, FareEstimate, Coupon, BookingPreference, BookingStatusHistory
        print("Models imported successfully.")
        
        # Test relationships
        booking = Booking()
        assert hasattr(booking, 'fare')
        assert hasattr(booking, 'preferences')
        assert hasattr(booking, 'status_history')
        print("SQLAlchemy relationships verified.")

        from app.schemas.booking import BookingCreateRequest, BookingResponse
        print("Pydantic schemas imported successfully.")
        
        from app.repositories.booking import BookingRepository
        print("Repository imported successfully.")
        
        from app.services.fare_service import FareService
        from app.services.vehicle_service import VehicleService
        from app.services.coupon_service import CouponService
        from app.services.booking_service import BookingService
        from app.services.schedule_service import ScheduleService
        print("Services imported successfully.")
        
        from app.routers.booking import router as booking_router
        print("Router imported successfully.")
        
        from app.main import app
        has_booking = any(r.path.startswith("/booking") for r in app.routes)
        assert has_booking, "Booking router not registered in main app"
        print("Router registered in main.py correctly.")
        
        print("ALL VERIFICATIONS PASSED")
    except Exception as e:
        print("VERIFICATION FAILED")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    verify()
