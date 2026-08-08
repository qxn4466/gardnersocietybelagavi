import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import masters, transactions, cashbook, ledger, auth, customers, translations, cashier, shopkeeper, meeting_notice

app = FastAPI(
    title="Belgaum Gardeners Society — Accounting System",
    description="3-Level Accounting: Credit Form → Cash Book → General Ledger",
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        from seed import seed
        seed()
        from seed_june_test_data import seed_june_data
        seed_june_data()
    except Exception as e:
        print(f"Startup DB Initialization Notice: {e}")

    db_url = str(engine.url)
    if "sqlite" in db_url:
        print("⚠️  WARNING: Using SQLite — data will NOT persist across Railway deployments!")
        print("   Fix: Add a PostgreSQL plugin in Railway and set DATABASE_URL environment variable.")
    else:
        print(f"✅ Using persistent PostgreSQL database.")


# ── Health / Status endpoint ─────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    """Returns the current database type and whether data will persist across deployments."""
    from sqlalchemy import text
    db_url = str(engine.url)
    is_sqlite = "sqlite" in db_url
    try:
        with engine.connect() as conn:
            txn_count = conn.execute(text("SELECT COUNT(*) FROM transactions")).scalar()
    except Exception:
        txn_count = -1
    return {
        "status": "ok",
        "database": "sqlite (⚠️ ephemeral — data lost on redeploy)" if is_sqlite else "postgresql (✅ persistent)",
        "data_persists": not is_sqlite,
        "transaction_count": txn_count,
        "fix_needed": is_sqlite,
        "fix_instructions": (
            "Add a PostgreSQL database in Railway dashboard, then set DATABASE_URL env var in your backend service."
            if is_sqlite else "No action needed."
        ),
    }


# Ensure uploads directory exists and mount static files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

raw_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
allowed_origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5175", "http://127.0.0.1:5175",
    "https://gardnersocietybelagavi.vercel.app",
    "https://gardnersocietybelgaum.vercel.app",
] + [o.strip() for o in raw_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(masters.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(cashbook.router, prefix="/api")
app.include_router(ledger.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(translations.router, prefix="/api")
app.include_router(cashier.router, prefix="/api")
app.include_router(shopkeeper.router, prefix="/api")
app.include_router(meeting_notice.router, prefix="/api")
