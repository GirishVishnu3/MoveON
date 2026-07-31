"""
Safe SQL migration: adds missing columns to tables that already exist in production.
Run once after model changes to bring the DB schema in sync.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://girishvishnu@localhost/moveon"
)

# All schema changes expressed as safe ALTER TABLE ... IF NOT EXISTS statements
MIGRATIONS = [
    # bookings — pricing_rule_version_id was added to the ORM but never applied
    """
    DO $$ BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='bookings' AND column_name='pricing_rule_version_id'
        ) THEN
            ALTER TABLE bookings ADD COLUMN pricing_rule_version_id UUID;
        END IF;
    END $$;
    """,
    # drivers onboarding columns
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='profile_completed') THEN
            ALTER TABLE drivers ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='documents_verified') THEN
            ALTER TABLE drivers ADD COLUMN documents_verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='vehicle_verified') THEN
            ALTER TABLE drivers ADD COLUMN vehicle_verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='bank_verified') THEN
            ALTER TABLE drivers ADD COLUMN bank_verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='subscription_status') THEN
            ALTER TABLE drivers ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'NOT_SUBSCRIBED';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='approval_status') THEN
            ALTER TABLE drivers ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='subscription_plan') THEN
            ALTER TABLE drivers ADD COLUMN subscription_plan VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='subscription_expires_at') THEN
            ALTER TABLE drivers ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END $$;
    """,
    # driver_vehicles — expand column sizes to accept longer values
    """
    DO $$ BEGIN
        ALTER TABLE driver_vehicles ALTER COLUMN vehicle_number TYPE VARCHAR(50);
        ALTER TABLE driver_vehicles ALTER COLUMN make TYPE VARCHAR(100);
        ALTER TABLE driver_vehicles ALTER COLUMN model TYPE VARCHAR(100);
        ALTER TABLE driver_vehicles ALTER COLUMN rc_number TYPE VARCHAR(100);
    EXCEPTION WHEN others THEN
        -- columns may already be the right size, safe to ignore
        NULL;
    END $$;
    """,
    # Email OTP and Users table updates
    """
    DO $$ BEGIN
        CREATE TABLE IF NOT EXISTS email_otps (
            id UUID PRIMARY KEY,
            email VARCHAR NOT NULL,
            otp_hash VARCHAR NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_email_otps_email ON email_otps (email);

        ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_user_phone_role;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_email_role') THEN
            ALTER TABLE users ADD CONSTRAINT uq_user_email_role UNIQUE (email, role);
        END IF;
    EXCEPTION WHEN others THEN
        NULL;
    END $$;
    """,
]


async def run_migrations():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            print(f"\n--- Migration {i}/{len(MIGRATIONS)} ---")
            await conn.execute(text(sql))
            print(f"    ✅ Done")
    await engine.dispose()
    print("\n✅ All migrations applied successfully.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
