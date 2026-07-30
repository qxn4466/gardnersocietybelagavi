import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import masters, transactions, cashbook, ledger, auth, customers, translations, cashier, shopkeeper, meeting_notice

app = FastAPI(
    title="Belagavi Gardeners Society — Accounting System",
    description="3-Level Accounting: Credit Form → Cash Book → General Ledger",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        from seed import seed
        seed()
    except Exception as e:
        print(f"Startup DB Initialization Notice: {e}")

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




@app.get("/")
@app.get("/health")
@app.get("/healthcheck")
def root():
    return {"status": "ok", "message": "Belagavi Gardeners Society API is running."}
