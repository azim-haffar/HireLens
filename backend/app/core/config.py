from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    resend_api_key: str = ""
    redis_url: str = "redis://redis:6379"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
