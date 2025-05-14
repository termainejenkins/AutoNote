from pydantic import BaseSettings
from typing import Dict, Any
import os

class Settings(BaseSettings):
    # API Gateway settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "AutoNote API Gateway"
    
    # Service URLs
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    NOTE_SERVICE_URL: str = os.getenv("NOTE_SERVICE_URL", "http://note-service:8002")
    CONTENT_SERVICE_URL: str = os.getenv("CONTENT_SERVICE_URL", "http://content-service:8003")
    AI_SERVICE_URL: str = os.getenv("AI_SERVICE_URL", "http://ai-service:8004")
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # Security settings
    API_KEY_HEADER: str = "X-API-Key"
    API_KEY: str = os.getenv("API_KEY", "your-api-key-here")
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Timeout settings
    REQUEST_TIMEOUT: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 