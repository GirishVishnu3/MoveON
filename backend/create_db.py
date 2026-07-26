"""
Database initializer — drops old pricing tables and creates all tables from scratch.
Run once during setup or after model changes.
"""
import asyncio
from app.database.database import engine, Base

# Import ALL models so SQLAlchemy knows about them
from app.models.user import User
from app.models.auth import OtpRequest, AuthSession, LoginHistory
from app.models.booking import Booking, FareEstimate, BookingPreference, BookingStatusHistory, Coupon
from app.models.payment import Payment, Invoice
from app.models.wallet import Wallet, WalletTransaction
from app.models.rating import Review
from app.models.notification import Notification, DeviceToken, NotificationPreference
from app.models.admin import AdminProfile
from app.models.audit import AuditLog
from app.models.support import SupportTicket, TicketMessage
from app.models.driver import (
    Driver, DriverProfile, DriverAddress, EmergencyContact,
    DriverAuditLog, DriverDraft, DriverStatus,
    DriverDocument, DriverVehicle, DriverBankDetails
)

# Pricing models — enterprise schema
from app.models.pricing import (
    City,
    VehicleBaseRate,
    PeakHourRule,
    SurgeRule,
    WeatherRule,
    TollRule,
    StateBorderCharge,
    PricingRuleVersion,
    PricingAuditLog,
)


async def drop_old_pricing_tables(conn):
    """Drop legacy Phase 1 pricing tables that are being replaced."""
    old_tables = [
        "pricing_logs",
        "pricing_rule_versions",
        "pricing_base_rates",
        "pricing_surge_rules",
        "pricing_time_rules",
        "pricing_incidental_fees",
        "pricing_tax_fees",
    ]
    for table in old_tables:
        try:
            await conn.execute(__import__("sqlalchemy").text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            print(f"  Dropped legacy table: {table}")
        except Exception as e:
            print(f"  Could not drop {table}: {e}")


async def init_models():
    async with engine.begin() as conn:
        print("Dropping legacy pricing tables...")
        await drop_old_pricing_tables(conn)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("All tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init_models())
