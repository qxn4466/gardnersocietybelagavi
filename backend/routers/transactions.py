import os
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, datetime, timedelta
from typing import List, Optional
from database import get_db
from models import Transaction, TransactionTypeMaster, CashScrollBookEntry
from schemas import TransactionCreate, TransactionOut, NextMemoResponse
from numbering import acquire_numbering_lock, ensure_free

router = APIRouter(prefix="/transactions", tags=["transactions"])


def generate_cash_memo_no(db: Session, txn_date: date) -> str:
    """Generate a sequential cash memo number: BGS-YYYYMMDD-XXXX"""
    prefix = f"BGS-{txn_date.strftime('%Y%m%d')}-"
    count = db.query(func.count(Transaction.id)).filter(
        Transaction.cash_memo_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(4)}"


def financial_year_bounds(txn_date: date) -> tuple[date, date]:
    """Return the April-to-March financial year containing txn_date."""
    start_year = txn_date.year if txn_date.month >= 4 else txn_date.year - 1
    return date(start_year, 4, 1), date(start_year + 1, 4, 1)


def generate_reference_no(db: Session, txn_date: date, entry_nature: str) -> str:
    """Generate B.No./V.No. serials independently for each financial year."""
    fy_start, fy_end = financial_year_bounds(txn_date)
    reference_column = Transaction.bill_no if entry_nature == "CREDIT" else Transaction.voucher_no
    references = (
        db.query(reference_column)
        .filter(Transaction.date >= fy_start, Transaction.date < fy_end, reference_column.isnot(None))
        .all()
    )
    highest = max((int(value[0]) for value in references if str(value[0]).isdigit()), default=0)
    return str(highest + 1).zfill(4)


# Upload Directory for Transaction Attachments (Credit-Debit Account Form)
TRANSACTION_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "transaction_attachments")
os.makedirs(TRANSACTION_UPLOAD_DIR, exist_ok=True)


def post_transaction_to_cash_scroll(db: Session, txn: Transaction):
    """Auto-post a POSTED transaction into the Cash Scroll Book (cash transactions only).

    CREDIT + CASH -> received_amount; DEBIT + CASH -> paid_amount; CHEQUE -> cheque_amount.
    Deduplicated by voucher_no == cash_memo_no so edits never create double entries.
    """
    if (txn.status or "POSTED") != "POSTED":
        return
    already = db.query(CashScrollBookEntry).filter(
        CashScrollBookEntry.voucher_no == txn.cash_memo_no
    ).first()
    if already:
        return
    amount = Decimal(str(txn.amount_rs or 0)) + (Decimal(str(txn.amount_ps or 0)) / Decimal("100"))
    is_cheque = (txn.payment_mode or "CASH").upper() == "CHEQUE"
    if is_cheque:
        received_amt, paid_amt, cheque_amt = Decimal("0.00"), Decimal("0.00"), amount
    elif (txn.entry_nature or "CREDIT").upper() == "DEBIT":
        received_amt, paid_amt, cheque_amt = Decimal("0.00"), amount, Decimal("0.00")
    else:
        received_amt, paid_amt, cheque_amt = amount, Decimal("0.00"), Decimal("0.00")
    prefix = "Paid To" if (txn.entry_nature or "CREDIT").upper() == "DEBIT" else "Received From"
    db.add(CashScrollBookEntry(
        date=txn.date,
        voucher_no=txn.cash_memo_no,
        from_received_paid=f"{prefix}: {txn.customer_name}"[:250],
        received_amount=received_amt,
        paid_amount=paid_amt,
        cheque_amount=cheque_amt,
        created_by=txn.created_by,
    ))


@router.post("/upload")
async def upload_transaction_attachment(file: UploadFile = File(...)):
    """Upload an attachment (bill, voucher scan, receipt photo) for Credit/Debit entries."""
    try:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        filename = f"txn_{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(TRANSACTION_UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        relative_path = f"/uploads/transaction_attachments/{filename}"
        return {"filename": filename, "filepath": relative_path, "original_name": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")


@router.get("/next-memo", response_model=NextMemoResponse)
def get_next_memo(txn_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Preview next cash memo number without saving"""
    d = date.fromisoformat(txn_date) if txn_date else date.today()
    return NextMemoResponse(cash_memo_no=generate_cash_memo_no(db, d))


@router.post("/reference/reserve")
def reserve_reference(payload: dict, db: Session = Depends(get_db)):
    """Generate the next B.No./V.No. and IMMEDIATELY persist a DRAFT placeholder row so the
    number is consumed and unique. Saving later fills/updates the row matching the number."""
    nature = str(payload.get("entry_nature", "CREDIT")).upper()
    if nature not in {"CREDIT", "DEBIT"}:
        raise HTTPException(status_code=400, detail="entry_nature must be CREDIT or DEBIT")
    d_raw = payload.get("txn_date")
    d = date.fromisoformat(d_raw) if d_raw else date.today()

    acquire_numbering_lock(db)

    # purge stale reserved placeholders (older than 24 h)
    stale_cutoff = datetime.utcnow() - timedelta(hours=24)
    db.query(Transaction).filter(
        Transaction.status == "DRAFT",
        Transaction.customer_name == "(reserved)",
        Transaction.created_at < stale_cutoff,
    ).delete(synchronize_session=False)
    db.commit()

    column = Transaction.bill_no if nature == "CREDIT" else Transaction.voucher_no

    def taken(n: str) -> bool:
        return db.query(Transaction.id).filter(column == n).first() is not None

    number = generate_reference_no(db, d, nature)
    guard = 0
    while taken(number) and guard < 200:
        number = generate_reference_no(db, d, nature)
        guard += 1

    memo_no = generate_cash_memo_no(db, d)
    txn = Transaction(
        date=d,
        cash_memo_no=memo_no,
        bill_no=number if nature == "CREDIT" else None,
        voucher_no=number if nature == "DEBIT" else None,
        customer_name="(reserved)",
        transaction_type_id=1,
        entry_nature=nature,
        amount_rs=Decimal("0"),
        amount_ps=Decimal("0"),
        status="DRAFT",
        created_by="reference-reservation",
    )
    db.add(txn)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict — please click Generate again.")
    return {"reference_no": number, "draft_id": txn.id}


@router.post("/reference/release")
def release_reference(payload: dict, db: Session = Depends(get_db)):
    """Remove an unused reserved placeholder (called on Reset)."""
    number = str(payload.get("number") or "").strip()
    nature = str(payload.get("entry_nature", "CREDIT")).upper()
    if number:
        column = Transaction.bill_no if nature == "CREDIT" else Transaction.voucher_no
        db.query(Transaction).filter(
            column == number,
            Transaction.status == "DRAFT",
            Transaction.customer_name == "(reserved)",
        ).delete(synchronize_session=False)
        db.commit()
    return {"released": True}


@router.get("/drafts", response_model=List[TransactionOut])
def get_drafts(db: Session = Depends(get_db)):
    """Return all saved draft transactions"""
    return (
        db.query(Transaction)
        .filter(
            Transaction.status == "DRAFT",
            Transaction.customer_name != "(reserved)",
        )
        .order_by(Transaction.created_at.desc())
        .all()
    )


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    type_id = payload.transaction_type_id or 1
    tt = db.query(TransactionTypeMaster).filter(
        TransactionTypeMaster.id == type_id
    ).first()
    if not tt:
        tt = db.query(TransactionTypeMaster).first()

    nature = payload.entry_nature
    if tt and (not nature or tt.entry_type in ["CREDIT", "DEBIT"]):
        nature = tt.entry_type if tt.entry_type != "BOTH" else (payload.entry_nature or "CREDIT")
    nature = nature or "CREDIT"

    # Serialize number allocation across worker processes (two cashiers saving at once)
    acquire_numbering_lock(db)

    memo_no = generate_cash_memo_no(db, payload.date)

    bill_no = payload.bill_no if nature == "CREDIT" else None
    voucher_no = payload.voucher_no if nature == "DEBIT" else None
    if nature == "CREDIT" and not bill_no:
        bill_no = generate_reference_no(db, payload.date, nature)
    if nature == "DEBIT" and not voucher_no:
        voucher_no = generate_reference_no(db, payload.date, nature)
    # If this Bill/Voucher No. was generated earlier, a DRAFT placeholder row already
    # exists — fill/update THAT row instead of creating a new one.
    placeholder = None
    if nature == "CREDIT" and payload.bill_no:
        placeholder = db.query(Transaction).filter(
            Transaction.bill_no == payload.bill_no,
            Transaction.status == "DRAFT",
        ).first()
    if nature == "DEBIT" and payload.voucher_no:
        placeholder = db.query(Transaction).filter(
            Transaction.voucher_no == payload.voucher_no,
            Transaction.status == "DRAFT",
        ).first()

    if placeholder:
        placeholder.date = payload.date
        placeholder.customer_id = payload.customer_id
        placeholder.mobile_no = payload.mobile_no
        placeholder.customer_name = payload.customer_name
        placeholder.particulars = payload.particulars
        placeholder.transaction_type_id = tt.id if tt else type_id
        placeholder.entry_nature = nature
        placeholder.amount_rs = payload.amount_rs
        placeholder.amount_ps = payload.amount_ps
        placeholder.payment_mode = (payload.payment_mode or "CASH").upper()
        placeholder.attachments = payload.attachments
        placeholder.remarks = payload.remarks
        placeholder.created_by = payload.created_by
        placeholder.status = payload.status or "POSTED"
        txn = placeholder
        db.flush()
        if (txn.status or "POSTED") == "POSTED":
            post_transaction_to_cash_scroll(db, txn)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Could not save — please retry.")
        db.refresh(txn)
        return txn

    if nature == "CREDIT" and bill_no:
        bill_no = ensure_free(db, Transaction, Transaction.bill_no, bill_no,
                              lambda: generate_reference_no(db, payload.date, "CREDIT"))
    if nature == "DEBIT" and voucher_no:
        voucher_no = ensure_free(db, Transaction, Transaction.voucher_no, voucher_no,
                                 lambda: generate_reference_no(db, payload.date, "DEBIT"))

    txn = Transaction(
        date=payload.date,
        cash_memo_no=memo_no,
        customer_id=payload.customer_id,
        bill_no=bill_no,
        voucher_no=voucher_no,
        mobile_no=payload.mobile_no,
        customer_name=payload.customer_name,
        particulars=payload.particulars,
        transaction_type_id=tt.id if tt else type_id,
        entry_nature=nature,
        amount_rs=payload.amount_rs,
        amount_ps=payload.amount_ps,
        payment_mode=(payload.payment_mode or "CASH").upper(),
        attachments=payload.attachments,
        remarks=payload.remarks,
        created_by=payload.created_by,
        status=payload.status or "POSTED",
    )
    db.add(txn)
    db.flush()
    post_transaction_to_cash_scroll(db, txn)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Numbering conflict with another user — please save again.")
    db.refresh(txn)
    return txn


@router.put("/{txn_id}", response_model=TransactionOut)
def update_transaction(txn_id: int, payload: TransactionCreate, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    type_id = payload.transaction_type_id or 1
    tt = db.query(TransactionTypeMaster).filter(
        TransactionTypeMaster.id == type_id
    ).first()
    if not tt:
        tt = db.query(TransactionTypeMaster).first()

    nature = payload.entry_nature
    if tt and (not nature or tt.entry_type in ["CREDIT", "DEBIT"]):
        nature = tt.entry_type if tt.entry_type != "BOTH" else (payload.entry_nature or "CREDIT")

    txn.date = payload.date
    txn.customer_id = payload.customer_id
    txn.bill_no = payload.bill_no
    txn.voucher_no = payload.voucher_no
    txn.mobile_no = payload.mobile_no
    txn.customer_name = payload.customer_name
    txn.particulars = payload.particulars
    txn.transaction_type_id = tt.id if tt else type_id
    txn.entry_nature = nature or "CREDIT"
    txn.amount_rs = payload.amount_rs
    txn.amount_ps = payload.amount_ps
    txn.payment_mode = (payload.payment_mode or "CASH").upper()
    txn.attachments = payload.attachments
    txn.remarks = payload.remarks
    txn.created_by = payload.created_by
    txn.status = payload.status or "POSTED"

    # If the new Bill/Voucher No. came from a Generate reservation, consume its placeholder
    ref_value = txn.bill_no if (txn.entry_nature or "CREDIT").upper() == "CREDIT" else txn.voucher_no
    if ref_value:
        ref_column = Transaction.bill_no if (txn.entry_nature or "CREDIT").upper() == "CREDIT" else Transaction.voucher_no
        db.query(Transaction).filter(
            ref_column == ref_value,
            Transaction.status == "DRAFT",
            Transaction.id != txn.id,
            Transaction.customer_name == "(reserved)",
        ).delete(synchronize_session=False)

    db.commit()
    db.refresh(txn)
    post_transaction_to_cash_scroll(db, txn)
    db.commit()
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
    q = db.query(Transaction).filter(
        ~and_(
            Transaction.status == "DRAFT",
            Transaction.customer_name == "(reserved)",
        )
    )
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
    db.query(CashScrollBookEntry).filter(
        CashScrollBookEntry.voucher_no == txn.cash_memo_no
    ).delete(synchronize_session=False)
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
