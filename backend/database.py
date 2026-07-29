import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = None
if DATABASE_URL:
    try:
        connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        test_engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        print(f"[DB] Successfully connected to primary DB.")
    except Exception as e:
        print(f"[DB Warning] Primary DB connection failed ({e}). Falling back to SQLite.")

if engine is None:
    DATABASE_URL = "sqlite:///./gardner_society.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print("[DB] Using local SQLite database: gardner_society.db")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Ensure tables are created
try:
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[DB Warning] Table creation notice: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
