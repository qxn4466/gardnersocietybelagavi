import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import masters, transactions, cashbook, ledger, auth, customers

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Belagavi Gardeners Society — Accounting System",
    description="3-Level Accounting: Credit Form → Cash Book → General Ledger",
    version="1.0.0",
)

# Ensure uploads directory exists and mount static files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(masters.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(cashbook.router, prefix="/api")
app.include_router(ledger.router, prefix="/api")
app.include_router(customers.router)


@app.get("/")
def root():
    return {"message": "Belagavi Gardeners Society API is running."}
