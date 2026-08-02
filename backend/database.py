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


# Ensure tables are created and missing columns auto-migrated
try:
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            try:
                if "sqlite" in engine.url.drivername:
                    res = conn.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
                    existing_cols = {row[1] for row in res}
                else:
                    res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")).fetchall()
                    existing_cols = {row[0] for row in res}

                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = "VARCHAR(500)"
                        if "INT" in str(col.type).upper():
                            col_type = "INTEGER"
                        elif "NUMERIC" in str(col.type).upper() or "DECIMAL" in str(col.type).upper():
                            col_type = "NUMERIC"
                        elif "DATE" in str(col.type).upper():
                            col_type = "DATE"
                        elif "TEXT" in str(col.type).upper():
                            col_type = "TEXT"

                        alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}"
                        print(f"[DB Auto-Migrate] Adding missing column: {alter_sql}")
                        conn.execute(text(alter_sql))
                        conn.commit()
            except Exception as ex:
                print(f"[DB Auto-Migrate Notice] {table_name}: {ex}")
except Exception as e:
    print(f"[DB Warning] Table creation notice: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
