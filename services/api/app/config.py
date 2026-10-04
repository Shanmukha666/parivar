import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    AUTH_PROVIDER: str = os.getenv("AUTH_PROVIDER", "legacy")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    EVIDENCE_CONFIDENCE_THRESHOLD: float = float(os.getenv("EVIDENCE_CONFIDENCE_THRESHOLD", "0.6"))

    def __init__(self):
        if self.AUTH_PROVIDER not in {"legacy", "supabase"}:
            raise RuntimeError("AUTH_PROVIDER must be legacy or supabase")
        if self.AUTH_PROVIDER == "legacy" and len(self.JWT_SECRET) < 32:
            raise RuntimeError("JWT_SECRET must be set and contain at least 32 characters")

settings = Settings()
