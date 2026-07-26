import asyncio
from sqlalchemy import text
from app.database.database import engine

async def run():
    async with engine.begin() as conn:
        print("Dropping unique index...")
        await conn.execute(text("DROP INDEX IF EXISTS ix_users_phone_number;"))
        print("Creating regular index...")
        await conn.execute(text("CREATE INDEX ix_users_phone_number ON users (phone_number);"))
        print("Adding composite unique constraint...")
        await conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_user_phone_role;"))
        await conn.execute(text("ALTER TABLE users ADD CONSTRAINT uq_user_phone_role UNIQUE (phone_number, role);"))
        print("Done!")

if __name__ == "__main__":
    asyncio.run(run())
