from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


DEFAULT_USERS = [
    {"username": "accountant", "password": "pass123", "full_name": "Accounts Officer", "role": "ACCOUNTS"},
    {"username": "cashier", "password": "pass123", "full_name": "Cashier", "role": "CASHIER"},
    {"username": "shopkeeper", "password": "pass123", "full_name": "Shop Keeper", "role": "SHOPKEEPER"},
]


def seed_default_users_if_empty(db: Session):
    try:
        for u in DEFAULT_USERS:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                db.add(User(**u))
        db.commit()
    except Exception:
        db.rollback()



@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    seed_default_users_if_empty(db)
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if not user or user.password != payload.password.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    return user
