import asyncio
import logging
from app.services.driver_search_service import DriverSearchService
from app.services.matching_service import MatchingService
from app.routers.websocket import manager as ws_manager
from app.repositories.booking import BookingRepository
from app.models.booking import BookingStatus
from app.database.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class DispatchEngine:
    TIMEOUT_SECONDS = 15

    @staticmethod
    async def start_dispatch(booking_ref: str, pickup_lat: float, pickup_lon: float, vehicle_category: str):
        """
        Fires a background task to run the dispatch loop.
        Must be called from within an async context (e.g. FastAPI endpoint).
        """
        asyncio.create_task(DispatchEngine._dispatch_loop(booking_ref, pickup_lat, pickup_lon, vehicle_category))

    @staticmethod
    async def _dispatch_loop(booking_ref: str, pickup_lat: float, pickup_lon: float, vehicle_category: str):
        async with AsyncSessionLocal() as session:
            try:
                search_service = DriverSearchService(session)
                matching_service = MatchingService()
                booking_repo = BookingRepository(session)

                # Search and Rank Drivers
                drivers = await search_service.search_nearby_drivers(pickup_lat, pickup_lon, vehicle_category)
                if not drivers:
                    logger.info(f"No drivers found for booking {booking_ref}")
                    await booking_repo.update_booking_status_by_ref(booking_ref, BookingStatus.FAILED, "No drivers available in area")
                    await ws_manager.send_personal_message(
                        {"type": "DISPATCH_FAILED", "reason": "No drivers available"},
                        f"rider_{booking_ref}"
                    )
                    return

                ranked_drivers = matching_service.rank_drivers(pickup_lat, pickup_lon, drivers)

                for driver in ranked_drivers:
                    driver_id = driver.driver_id
                    # Notify driver
                    await ws_manager.send_personal_message({
                        "type": "INCOMING_RIDE",
                        "booking_ref": booking_ref,
                        "pickup_lat": pickup_lat,
                        "pickup_lon": pickup_lon,
                        "timeout": DispatchEngine.TIMEOUT_SECONDS
                    }, f"driver_{driver_id}")

                    # Notify rider about progress
                    await ws_manager.send_personal_message({
                        "type": "DISPATCH_UPDATE",
                        "status": "Contacting nearby driver..."
                    }, f"rider_{booking_ref}")

                    # Poll DB for 15s to see if driver accepted
                    accepted = False
                    for _ in range(DispatchEngine.TIMEOUT_SECONDS):
                        await asyncio.sleep(1)
                        booking = await booking_repo.get_booking_by_ref(booking_ref)
                        if booking is None:
                            return
                        if booking.status == BookingStatus.DRIVER_ASSIGNED:
                            accepted = True
                            break
                        if booking.status == BookingStatus.CANCELLED:
                            return  # Rider cancelled

                    if accepted:
                        logger.info(f"Driver {driver_id} accepted booking {booking_ref}")
                        return
                    else:
                        logger.info(f"Driver {driver_id} timed out for booking {booking_ref}")

                # Exhausted all drivers
                logger.info(f"All drivers exhausted for booking {booking_ref}")
                await booking_repo.update_booking_status_by_ref(booking_ref, BookingStatus.FAILED, "No drivers accepted")
                await ws_manager.send_personal_message(
                    {"type": "DISPATCH_FAILED", "reason": "No drivers accepted the ride"},
                    f"rider_{booking_ref}"
                )

            except Exception as e:
                logger.error(f"Dispatch engine error for booking {booking_ref}: {e}", exc_info=True)
