from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .configuration.settings import settings
from .authentication.router import router as auth_router
from .models.payment import Payment, Invoice
from .models.wallet import Wallet, WalletTransaction
from .models.rating import Review
from .models.notification import Notification, DeviceToken, NotificationPreference
from .models.admin import AdminProfile
from .models.audit import AuditLog
from .models.support import SupportTicket, TicketMessage
from .models.pricing import (
    City, VehicleBaseRate, PeakHourRule, SurgeRule,
    WeatherRule, TollRule, StateBorderCharge,
    PricingRuleVersion, PricingAuditLog
)

from .routers.location import router as location_router
from .routers import booking, driver, websocket, trip, payment, wallet, history
from fastapi.responses import JSONResponse
import traceback
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="MoveON API",
    description="Backend for MoveON ride-hailing platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"https?://(.*\.vercel\.app|.*\.railway\.app|localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    logger.error(traceback.format_exc())
    # Return detail only if we want to show it, the prompt asks to return actual error message during development
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc() if os.getenv("SMS_PROVIDER") == "DEV" else "Internal Server Error"}
    )

from .routers import driver_auth, driver_onboarding
app.include_router(auth_router)
app.include_router(driver_auth.router)
app.include_router(driver_onboarding.router)
app.include_router(location_router)
app.include_router(booking.router)
app.include_router(driver.router)
app.include_router(websocket.router)
app.include_router(trip.router)
app.include_router(payment.router)
app.include_router(wallet.router)
app.include_router(history.router)
from .routers import notification, admin
app.include_router(notification.router)
app.include_router(admin.router)
from .routers import admin_pricing, admin_verification
app.include_router(admin_pricing.router)
app.include_router(admin_verification.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": app.version}

@app.get("/")
async def root():
    return {"message": "Welcome to MoveON API"}
