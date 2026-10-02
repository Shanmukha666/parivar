import os

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        DATABASE_URL: str = "postgresql+asyncpg://parivar:parivar_dev_2024@localhost:5432/parivar_path"
        DATABASE_URL_SYNC: str = "postgresql://parivar:parivar_dev_2024@localhost:5432/parivar_path"
        REDIS_URL: str = "redis://localhost:6379/0"
        ANTHROPIC_API_KEY: str = ""
        JWT_SECRET: str = "parivar-jwt-secret-change-in-prod"
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

        class Config:
            env_file = ".env"
            extra = "allow"
except ImportError:
    try:
        from pydantic import BaseSettings
        class Settings(BaseSettings):
            DATABASE_URL: str = "postgresql+asyncpg://parivar:parivar_dev_2024@localhost:5432/parivar_path"
            DATABASE_URL_SYNC: str = "postgresql://parivar:parivar_dev_2024@localhost:5432/parivar_path"
            REDIS_URL: str = "redis://localhost:6379/0"
            ANTHROPIC_API_KEY: str = ""
            JWT_SECRET: str = "parivar-jwt-secret-change-in-prod"
            ALGORITHM: str = "HS256"
            ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
            class Config:
                env_file = ".env"
    except ImportError:
        class Settings:
            DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://parivar:parivar_dev_2024@localhost:5432/parivar_path")
            DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC", "postgresql://parivar:parivar_dev_2024@localhost:5432/parivar_path")
            REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
            JWT_SECRET: str = os.getenv("JWT_SECRET", "parivar-jwt-secret-change-in-prod")
            ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
            ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

settings = Settings()
