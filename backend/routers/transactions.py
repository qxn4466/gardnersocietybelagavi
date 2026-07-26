from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Optional
from database import get_db
from models import Transaction, TransactionTypeMaster
from schemas import TransactionCreate, TransactionOut, NextMemoResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


def generate_cash_memo_no(db: Session, txn_date: date) -> str:
    """Generate a sequential cash memo number: BGS-YYYYMMDD-XXXX"""
    prefix = f"BGS-{txn_date.strftime('%Y%m%d')}-"
    count = db.query(func.count(Transaction.id)).filter(
        Transaction.cash_memo_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(4)}"


@router.get("/next-memo", response_model=NextMemoResponse)
def get_next_memo(txn_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Preview next cash memo number without saving"""
    d = date.fromisoformat(txn_date) if txn_date else date.today()
    return NextMemoResponse(cash_memo_no=generate_cash_memo_no(db, d))


@router.get("/drafts", response_model=List[TransactionOut])
def get_drafts(db: Session = Depends(get_db)):
    """Return all saved draft transactions"""
    return (
        db.query(Transaction)
        .filter(Transaction.status == "DRAFT")
        .order_by(Transaction.created_at.desc())
        .all()
    )


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    # Validate transaction type
    tt = db.query(TransactionTypeMaster).filter(
        TransactionTypeMaster.id == payload.transaction_type_id
    ).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    memo_no = generate_cash_memo_no(db, payload.date)

    # Determine entry_nature (CREDIT vs DEBIT)
    nature = payload.entry_nature
    if not nature or tt.entry_type in ["CREDIT", "DEBIT"]:
        nature = tt.entry_type if tt.entry_type != "BOTH" else (payload.entry_nature or "CREDIT")

    txn = Transaction(
        date=payload.date,
        cash_memo_no=memo_no,
        customer_id=payload.customer_id,
        mobile_no=payload.mobile_no,
        customer_name=payload.customer_name,
        particulars=payload.particulars,
        transaction_type_id=payload.transaction_type_id,
        entry_nature=nature,
        amount_rs=payload.amount_rs,
        amount_ps=payload.amount_ps,
        remarks=payload.remarks,
        created_by=payload.created_by,
        status=payload.status or "POSTED",
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.put("/{txn_id}", response_model=TransactionOut)
def update_transaction(txn_id: int, payload: TransactionCreate, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tt = db.query(TransactionTypeMaster).filter(
        TransactionTypeMaster.id == payload.transaction_type_id
    ).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    nature = payload.entry_nature
    if not nature or tt.entry_type in ["CREDIT", "DEBIT"]:
        nature = tt.entry_type if tt.entry_type != "BOTH" else (payload.entry_nature or "CREDIT")

    txn.date = payload.date
    txn.customer_id = payload.customer_id
    txn.mobile_no = payload.mobile_no
    txn.customer_name = payload.customer_name
    txn.particulars = payload.particulars
    txn.transaction_type_id = payload.transaction_type_id
    txn.entry_nature = nature
    txn.amount_rs = payload.amount_rs
    txn.amount_ps = payload.amount_ps
    txn.remarks = payload.remarks
    txn.created_by = payload.created_by
    txn.status = payload.status or "POSTED"

    db.commit()
    db.refresh(txn)
    return txn


@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type_id: Optional[int] = None,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Transaction)
    if start_date:
        q = q.filter(Transaction.date >= date.fromisoformat(start_date))
    if end_date:
        q = q.filter(Transaction.date <= date.fromisoformat(end_date))
    if transaction_type_id:
        q = q.filter(Transaction.transaction_type_id == transaction_type_id)
    if customer_id:
        q = q.filter(
            (Transaction.customer_id.ilike(f"%{customer_id}%")) |
            (Transaction.customer_name.ilike(f"%{customer_id}%")) |
            (Transaction.mobile_no.ilike(f"%{customer_id}%"))
        )
    if status:
        q = q.filter(Transaction.status == status)
    return q.order_by(Transaction.date.desc(), Transaction.id.desc()).all()


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()


@router.post("/seed-june-test-data")
def trigger_seed_june_test_data():
    from seed_june_test_data import seed_june_data
    return seed_june_data()


@router.delete("/clear-june-test-data")
def trigger_clear_june_test_data():
    from clear_june_test_data import clear_june_data
    return clear_june_data()
