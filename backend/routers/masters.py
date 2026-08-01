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
        office = OfficeMaster(
            office_name="Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.",
            address="Belgaum, Karnataka - 590001",
            phone1="0831-2400000",
            phone2="0831-2411111",
            gst_no="29AAAAA0000A1Z5",
        )
        try:
            db.add(office)
            db.commit()
            db.refresh(office)
        except Exception:
            db.rollback()
            return OfficeMasterOut(
                id=1,
                office_name="Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.",
                address="Belgaum, Karnataka - 590001",
                phone1="0831-2400000",
                phone2="0831-2411111",
                gst_no="29AAAAA0000A1Z5",
            )
    return office


# ─── Transaction Types ─────────────────────────────────────────────────────────
@router.get("/transaction-types", response_model=List[TransactionTypeOut])
def get_transaction_types(db: Session = Depends(get_db)):
    types = db.query(TransactionTypeMaster).order_by(TransactionTypeMaster.display_order).all()
    if not types:
        from seed import seed
        seed()
        types = db.query(TransactionTypeMaster).order_by(TransactionTypeMaster.display_order).all()
    return types


# ─── Account Master ─────────────────────────────────────────────────────────────
@router.get("/accounts", response_model=List[AccountMasterOut])
def get_accounts(db: Session = Depends(get_db)):
    accs = db.query(AccountMaster).order_by(AccountMaster.account_name).all()
    if not accs:
        from seed import seed
        seed()
        accs = db.query(AccountMaster).order_by(AccountMaster.account_name).all()
    return accs
