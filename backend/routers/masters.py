from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import OfficeMaster, TransactionTypeMaster, AccountMaster, ListOptionMaster
from schemas import OfficeMasterOut, TransactionTypeOut, TransactionTypeCreate, AccountMasterOut, ListOptionCreate
from typing import List

router = APIRouter(prefix="/masters", tags=["masters"])


# ─── Office Master ─────────────────────────────────────────────────────────────
@router.get("/office", response_model=OfficeMasterOut)
def get_office(db: Session = Depends(get_db)):
    office = db.query(OfficeMaster).first()
    if not office:
        office = OfficeMaster(
            office_name="Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.",
            address="930/1A Zanda Chowk Market, Belgaum 590002",
            phone1="0831-2460534",
            phone2="0831-2400124",
            gst_no="29AAAAB1234C1Z5",
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
                address="930/1A Zanda Chowk Market, Belgaum 590002",
                phone1="0831-2460534",
                phone2="0831-2400124",
                gst_no="29AAAAB1234C1Z5",
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


@router.post("/transaction-types", response_model=TransactionTypeOut)
def create_transaction_type(payload: TransactionTypeCreate, db: Session = Depends(get_db)):
    """Create a new transaction type / account head so it appears in dropdowns everywhere."""
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Transaction type name is required")

    existing = (
        db.query(TransactionTypeMaster)
        .filter(func.lower(TransactionTypeMaster.name) == name.lower())
        .first()
    )
    if existing:
        return existing

    entry_type = (payload.entry_type or "CREDIT").upper()
    if entry_type not in {"CREDIT", "DEBIT", "BOTH"}:
        entry_type = "CREDIT"

    new_type = TransactionTypeMaster(
        name=name,
        cash_book_column="sundary_ac",
        ledger_account=name,
        entry_type=entry_type,
        display_order=99,
    )
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type


@router.get("/options", response_model=List[str])
def get_list_options(category: str, db: Session = Depends(get_db)):
    """Persisted dropdown options for a category (e.g. rent, receipt, payment particulars)."""
    rows = (
        db.query(ListOptionMaster)
        .filter(ListOptionMaster.category == category)
        .order_by(ListOptionMaster.name.asc())
        .all()
    )
    return [r.name for r in rows]


@router.post("/options", response_model=List[str])
def create_list_option(payload: ListOptionCreate, db: Session = Depends(get_db)):
    """Persist a new dropdown option so it appears in the list for every user after refresh."""
    category = (payload.category or "").strip()
    name = (payload.name or "").strip()
    if not category or not name:
        raise HTTPException(status_code=400, detail="category and name are required")

    existing = (
        db.query(ListOptionMaster)
        .filter(
            ListOptionMaster.category == category,
            func.lower(ListOptionMaster.name) == name.lower(),
        )
        .first()
    )
    if not existing:
        db.add(ListOptionMaster(category=category, name=name))
        db.commit()

    rows = (
        db.query(ListOptionMaster)
        .filter(ListOptionMaster.category == category)
        .order_by(ListOptionMaster.name.asc())
        .all()
    )
    return [r.name for r in rows]


# ─── Account Master ─────────────────────────────────────────────────────────────
@router.get("/accounts", response_model=List[AccountMasterOut])
def get_accounts(db: Session = Depends(get_db)):
    accs = db.query(AccountMaster).order_by(AccountMaster.account_name).all()
    if not accs:
        from seed import seed
        seed()
        accs = db.query(AccountMaster).order_by(AccountMaster.account_name).all()
    return accs
