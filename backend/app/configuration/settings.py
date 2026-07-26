from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MoveON API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DB
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/moveon"
    
    SMS_PROVIDER: str = "DEV"
    
    class Config:
        env_file = ".env"

settings = Settings()
