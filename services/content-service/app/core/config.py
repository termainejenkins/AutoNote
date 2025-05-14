from pydantic import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "AutoNote Content Service"
    
    # Auth Service settings
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/content_db")
    
    # Redis settings for caching
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Content processing settings
    MAX_CONTENT_LENGTH: int = 1000000  # 1MB
    SUPPORTED_SOURCE_TYPES: list = ["web", "pdf", "video", "coursera"]
    
    # Playwright settings
    PLAYWRIGHT_HEADLESS: bool = True
    PLAYWRIGHT_TIMEOUT: int = 30000  # 30 seconds
    
    # PDF processing settings
    MAX_PDF_SIZE: int = 10485760  # 10MB
    MAX_PDF_PAGES: int = 1000
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 