import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Determine database URL
db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)

# Fallback to local SQLite if specified or if default placeholder
if not db_url or os.getenv("USE_SQLITE", "false").lower() == "true" or "sqlite" in db_url:
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "parivar.db"))
    db_url = f"sqlite+aiosqlite:///{db_path}"

engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
