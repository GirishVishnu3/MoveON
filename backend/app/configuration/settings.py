from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "MoveON API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DB - defaults to SQLite for local dev, use DATABASE_URL env var in production
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./moveon.db"
    )
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "moveon-secret-key-change-in-production")
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "DEV")
    
    class Config:
        env_file = ".env"

settings = Settings()
