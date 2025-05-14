from pydantic import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "AutoNote AI Service"
    
    # Auth Service settings
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/ai_db")
    
    # Redis settings for caching
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # AI Model settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL_NAME: str = "gpt-3.5-turbo"
    
    # Content processing settings
    MAX_CONTENT_LENGTH: int = 4000  # Maximum tokens for GPT-3.5
    DEFAULT_NUM_KEY_POINTS: int = 5
    DEFAULT_NUM_QUESTIONS: int = 3
    
    # Model parameters
    SUMMARY_MAX_LENGTH: int = 130
    SUMMARY_MIN_LENGTH: int = 30
    QUESTION_MAX_LENGTH: int = 100
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 