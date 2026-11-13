"""Configuration management via pydantic-settings."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "ALICE Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Supabase PostgreSQL, Auth & Storage
    SUPABASE_URL: str = "https://mock-alice-project.supabase.co"
    SUPABASE_ANON_KEY: str = "mock-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-role-key"
    SUPABASE_JWT_SECRET: str = "mock-jwt-secret-at-least-32-bytes-long-for-hs256"
    SUPABASE_STORAGE_PUBLIC_BUCKET: str = "public-media"
    SUPABASE_STORAGE_PRIVATE_BUCKET: str = "private-verification"

    # Twilio WhatsApp Business API (Optional / Legacy)
    TWILIO_ACCOUNT_SID: str = "ACmockaccountsid00000000000000000"
    TWILIO_AUTH_TOKEN: str = "mock_twilio_auth_token"
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"

    # Meta WhatsApp Cloud API (Graph API v22.0)
    WHATSAPP_ACCESS_TOKEN: str = "mock_whatsapp_access_token"
    WHATSAPP_PHONE_NUMBER_ID: str = "mock_whatsapp_phone_number_id"
    WHATSAPP_APP_SECRET: str = "mock_whatsapp_app_secret"
    WHATSAPP_VERIFY_TOKEN: str = "mock_whatsapp_verify_token"
    WHATSAPP_GRAPH_VERSION: str = "v22.0"

    # Google Gemini AI Provider
    GEMINI_API_KEY: str = "mock_gemini_api_key"
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
