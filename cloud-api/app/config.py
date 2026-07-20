"""PT Dashboard cloud API configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://ptdashboard:ptdashboard@192.168.0.216:5432/ptdashboard"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 hours
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://192.168.0.216:5173"

    class Config:
        env_file = ".env"


settings = Settings()
