import logging
import os
import secrets

from pydantic import Field
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Operations Exception Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development")
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./data/ops_agent.db")
    
    # Security
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Resolved securely via multi-tier fallback
    _jwt_secret_override: str | None = None
    
    @property
    def JWT_SECRET_KEY(self) -> str:
        if self._jwt_secret_override:
            return self._jwt_secret_override
        env_val = os.getenv("JWT_SECRET_KEY")
        if env_val:
            return env_val
        if os.path.exists("jwt_secret.txt"):
            with open("jwt_secret.txt", "r") as f:
                return f.read().strip()
        logger.warning(
            "JWT_SECRET_KEY not configured in environment. "
            "Generating ephemeral secret. Instance-isolated for development!"
        )
        self._jwt_secret_override = secrets.token_hex(32)
        return self._jwt_secret_override

    # Storage
    STORAGE_BACKEND: str = Field(default="local")  # 'local' or 'gcs'
    LOCAL_STORAGE_DIR: str = Field(default="./data/storage")
    GCS_BUCKET_NAME: str = Field(default="ops-agent-source-documents")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    
    # Agentic & Vertex AI
    VERTEX_AI_PROJECT: str = Field(default="")
    VERTEX_AI_LOCATION: str = Field(default="us-central1")
    GEMINI_MODEL: str = Field(default="gemini-1.5-pro")
    USE_MOCK_LLM_IN_DEV: bool = Field(default=True)
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
