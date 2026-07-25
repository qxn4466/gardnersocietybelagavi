from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import OfficeMaster, TransactionTypeMaster, AccountMaster
from schemas import OfficeMasterOut, TransactionTypeOut, AccountMasterOut
from typing import List

router = APIRouter(prefix="/masters", tags=["masters"])


# ─── Office Master ─────────────────────────────────────────────────────────────
@router.get("/office", response_model=OfficeMasterOut)
def get_office(db: Session = Depends(get_db)):
    office = db.query(OfficeMaster).first()
    if not office:
        raise HTTPException(status_code=404, detail="Office master not configured")
    return office


# ─── Transaction Types ─────────────────────────────────────────────────────────
@router.get("/transaction-types", response_model=List[TransactionTypeOut])
def get_transaction_types(db: Session = Depends(get_db)):
    types = db.query(TransactionTypeMaster).order_by(TransactionTypeMaster.display_order).all()
    return types


# ─── Account Master ─────────────────────────────────────────────────────────────
@router.get("/accounts", response_model=List[AccountMasterOut])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(AccountMaster).order_by(AccountMaster.account_name).all()
