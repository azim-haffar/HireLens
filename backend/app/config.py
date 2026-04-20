import logging
import logging.config
from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
            "stream": "ext://sys.stdout",
        }
    },
    "root": {"level": "INFO", "handlers": ["console"]},
    "loggers": {
        "uvicorn": {"level": "INFO"},
        "uvicorn.access": {"level": "WARNING"},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    groq_api_key: str
    secret_key: str = "dev-secret-key-change-in-production"
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"
    sentry_dsn: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"

    model_config = {"env_file": ".env", "case_sensitive": False}

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment == "production":
            if (
                self.secret_key == "dev-secret-key-change-in-production"
                or len(self.secret_key) < 32
            ):
                raise ValueError(
                    "SECRET_KEY must be a strong unique value (≥32 chars) in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
