"""Configuration settings for the application."""
from typing import List
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "Valar Studio"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./data/valar.db"

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS / shared frontend origins
    ALLOWED_ORIGINS_RAW: str = Field(
        default="http://localhost:3001,http://localhost:5173",
        alias="APP_ALLOWED_ORIGINS",
    )
    ALLOWED_ORIGINS: List[str] = Field(default_factory=list)
    CORS_ORIGINS: List[str] = Field(default_factory=list)

    # Admin
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123456"

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"

    # MongoDB
    VALAR_MONGO_CONNECTION: str = "CLOUD"

    @field_validator("ALLOWED_ORIGINS", "CORS_ORIGINS", mode="before")
    @classmethod
    def _split_csv(cls, value: List[str] | str | None):
        """Allow comma-separated environment variables for origin lists."""
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def _apply_allowed_origins(self):
        """Fall back to ALLOWED_ORIGINS when CORS_ORIGINS is not explicitly set."""
        if self.ALLOWED_ORIGINS_RAW:
            parsed = self._split_csv(self.ALLOWED_ORIGINS_RAW)
            if not self.ALLOWED_ORIGINS:
                self.ALLOWED_ORIGINS = parsed
        if not self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = [
                "http://localhost:3001",
                "http://localhost:5173",
            ]
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = self.ALLOWED_ORIGINS
        return self

    class Config:
        env_file = ROOT_DIR / ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Ensure data directory exists
settings.DATA_DIR.mkdir(exist_ok=True, parents=True)
