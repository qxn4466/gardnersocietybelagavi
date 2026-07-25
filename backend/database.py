import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/gardner_society"
)

# Only log if DATABASE_URL appears to be the default (for local dev)
if DATABASE_URL == "postgresql://postgres:postgres@localhost:5432/gardner_society":
    print("⚠️  Using default DATABASE_URL. Set the DATABASE_URL environment variable in production.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Initialize engine lazily to avoid crashes if DATABASE_URL is invalid
engine = None
SessionLocal = None

def get_engine():
    global engine
    if engine is None:
        engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
    return engine

def get_session_maker():
    global SessionLocal
    if SessionLocal is None:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return SessionLocal


class Base(DeclarativeBase):
    pass


def get_db():
    db = get_session_maker()()
    try:
        yield db
    finally:
        db.close()

