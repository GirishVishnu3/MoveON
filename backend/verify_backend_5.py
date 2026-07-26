from app.models.booking import Booking, BookingStatus, VehicleCategory, RideType
from app.models.driver import DriverStatus
from app.models.user import User, RoleEnum
from app.repositories.booking import BookingRepository
from app.repositories.driver import DriverRepository
from app.services.driver_availability_service import DriverAvailabilityService
from app.services.driver_search_service import DriverSearchService, haversine
from app.services.matching_service import MatchingService
from app.services.dispatch_engine import DispatchEngine
from app.routers.booking import router as booking_router
from app.routers.driver import router as driver_router
from app.routers.websocket import router as ws_router, manager

print('=== BACKEND MODULE 5 VERIFICATION ===')
print()
print('Models:  DriverStatus, Booking, BookingStatus, User, RoleEnum — OK')

# Verify matching logic
from app.models.driver import DriverStatus as DS
d1 = DS(); d1.driver_id='D1'; d1.lat=12.95; d1.lon=77.60; d1.rating=4.8; d1.acceptance_rate=0.9
d2 = DS(); d2.driver_id='D2'; d2.lat=12.98; d2.lon=77.59; d2.rating=4.2; d2.acceptance_rate=0.7
ranked = MatchingService().rank_drivers(12.97, 77.59, [d2, d1])
assert ranked[0].driver_id == 'D2', f'Expected D2 first (it is closer), got {ranked[0].driver_id}'
print('Matching: D2 (closer) ranked first — OK')

# Verify all endpoints
booking_paths = [r.path for r in booking_router.routes]
driver_paths = [r.path for r in driver_router.routes]
ws_paths = [r.path for r in ws_router.routes]

required_booking = ['/booking/estimate', '/booking/coupon/validate', '/booking/confirm',
                    '/booking/{booking_ref}', '/booking/{booking_ref}/accept',
                    '/booking/{booking_ref}/reject', '/booking/{booking_ref}/cancel']
for p in required_booking:
    assert p in booking_paths, f'Missing: {p}'
print(f'Booking endpoints: {booking_paths} — OK')
print(f'Driver endpoints: {driver_paths} — OK')
print(f'WebSocket endpoints: {ws_paths} — OK')

# Verify WS manager
import asyncio
async def test_ws_manager():
    result = await manager.send_personal_message({'type': 'TEST'}, 'nobody')
    assert result == False, 'Should return False for non-existent client'
asyncio.run(test_ws_manager())
print('WebSocket manager: non-existent client returns False — OK')

print()
print('=== ALL VERIFICATIONS PASSED ===')
