from pydantic import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "AutoNote Auth Service"
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/auth_db")
    
    # Redis settings for token blacklisting
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 