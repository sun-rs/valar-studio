"""Database configuration and session management."""
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings


# Ensure database path is absolute when using relative sqlite URLs
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./"):
    relative_path = db_url[len("sqlite:///./"):]
    db_path = (settings.BASE_DIR / Path(relative_path)).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_url = f"sqlite:///{db_path}"

# Create SQLite engine
engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False},
    echo=settings.DEBUG
)


# Enable foreign key constraints for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
