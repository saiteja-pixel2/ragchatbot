import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusIQ API"
    VERSION: str = "1.0.0"
    
    # Supabase Configuration
    SUPABASE_URL: str = "https://your-supabase-project.supabase.co"
    SUPABASE_KEY: str = "your-supabase-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-supabase-service-role-key"
    
    # JWT Security
    JWT_SECRET: str = "your-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    
    # LLM & Embedding Secrets
    GEMINI_API_KEY: str = "your-gemini-api-key"
    
    # CORS Security
    ALLOWED_ORIGIN: str = "http://localhost:3000"

    # ChromaDB Persistence Directory
    CHROMA_PERSIST_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
