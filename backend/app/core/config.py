import logging
import os
import secrets
from pathlib import Path
from typing import Any
from dotenv import load_dotenv

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

# Ensure .env from project root is reliably loaded into environment
ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(dotenv_path=ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Operations Exception Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Server Configuration
    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8000)
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
    
    # Agentic & Multi-Provider LLM Keys
    GEMINI_API_KEY: str | None = Field(default=None)
    GOOGLE_API_KEY: str | None = Field(default=None)
    OPENAI_API_KEY: str | None = Field(default=None)
    VERTEX_AI_PROJECT: str = Field(default="")
    VERTEX_AI_LOCATION: str = Field(default="us-central1")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini")
    USE_MOCK_LLM_IN_DEV: bool = Field(default=False)
    AGENTIC_WORKER_URL: str = Field(default="https://opsera-agentic-1030854563974.us-central1.run.app")
    
    # CORS
    CORS_ORIGINS: list[str] | str = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://opsera-frontend-1030854563974.us-central1.run.app",
        ]
    )

    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(item) for item in v]
        return [str(v)]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

