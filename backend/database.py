import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Fallback sqlite engine if DATABASE_URL is empty or invalid
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./fallback.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    if "sqlite" in DATABASE_URL:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
except Exception as e:
    print(f"Warning: Failed to create engine with {DATABASE_URL}: {e}")
    engine = create_engine("sqlite:///./fallback.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        print(f"[DB Warning] Database session creation failed: {e}")
        yield None
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass
