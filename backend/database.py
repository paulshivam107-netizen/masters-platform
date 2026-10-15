from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import get_settings, sqlalchemy_url

settings = get_settings()
DATABASE_URL = sqlalchemy_url(settings.DATABASE_URL)


def engine_options(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "pool_pre_ping": True}
    return {
        # Fail fast on bad managed DB connectivity instead of hanging requests.
        "connect_args": {"connect_timeout": 5},
        "pool_pre_ping": True,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
        # Managed Postgres (Neon) closes idle connections; recycle before that happens.
        "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
    }


engine = create_engine(DATABASE_URL, **engine_options(DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
