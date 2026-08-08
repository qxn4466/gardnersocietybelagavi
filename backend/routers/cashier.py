import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Optional
from decimal import Decimal

from database import get_db
from models import (
    CashPaymentVoucher,
    CashReceiptVoucher,
    RentBill,
    CashScrollBookEntry,
    ChequeIssueBookEntry,
    Transaction,
    TransactionTypeMaster
)
from schemas import (
    CashPaymentVoucherCreate, CashPaymentVoucherOut,
    CashReceiptVoucherCreate, CashReceiptVoucherOut,
    RentBillCreate, RentBillOut,
    CashScrollBookCreate, CashScrollBookOut,
    ChequeIssueBookCreate, ChequeIssueBookOut,
    CashierAuditSummary
)

router = APIRouter(prefix="/cashier", tags=["cashier"])


# ─── Helper for Auto-Posting to Main Transactions Table ───────────────────────
def sync_transaction_for_cashier_voucher(
    db: Session,
    memo_no: str,
    v_date: date,
    customer_name: str,
    particulars: str,
    nature: str,
    total_amount: Decimal,
    remarks: str,
    created_by: str,
    status: str = "POSTED",
    target_account_name: Optional[str] = None
):
    """Auto-post or update transaction in main Transactions table so Credit Book, Debit Book & General Ledger update immediately."""
    tt_query = db.query(TransactionTypeMaster)
    tt_match = None
    if target_account_name:
        tt_match = tt_query.filter(TransactionTypeMaster.name.ilike(f"%{target_account_name}%")).first()
    if not tt_match:
        tt_match = tt_query.filter(TransactionTypeMaster.name == "Sundrey A/C").first()
    if not tt_match:
        tt_match = tt_query.first()

    tt_id = tt_match.id if tt_match else 1

    tot_dec = Decimal(str(total_amount or 0))
    amt_rs = int(tot_dec)
    amt_ps = int(round((tot_dec - Decimal(amt_rs)) * 100))

    existing = db.query(Transaction).filter(Transaction.cash_memo_no == memo_no).first()
    if existing:
        existing.date = v_date
        existing.customer_name = customer_name
        existing.particulars = particulars
        existing.transaction_type_id = tt_id
        existing.entry_nature = nature
        existing.amount_rs = Decimal(str(amt_rs))
        existing.amount_ps = Decimal(str(amt_ps))
        existing.remarks = remarks
        existing.created_by = created_by
        existing.status = status
    else:
        new_txn = Transaction(
            date=v_date,
            cash_memo_no=memo_no,
            customer_name=customer_name,
            particulars=particulars,
            transaction_type_id=tt_id,
            entry_nature=nature,
            amount_rs=Decimal(str(amt_rs)),
            amount_ps=Decimal(str(amt_ps)),
            remarks=remarks,
            created_by=created_by,
            status=status
        )
        db.add(new_txn)


def delete_transaction_for_cashier_voucher(db: Session, memo_no: str):
    """Delete corresponding transaction when cashier voucher/bill is deleted."""
    db.query(Transaction).filter(Transaction.cash_memo_no == memo_no).delete(synchronize_session=False)


# Upload Directory for Cashier Receipts
CASHIER_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "cashier_receipts")
os.makedirs(CASHIER_UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_cashier_receipt(
    file: UploadFile = File(...)
):
    try:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
        filename = f"receipt_{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(CASHIER_UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        relative_path = f"/uploads/cashier_receipts/{filename}"
        return {"filename": filename, "filepath": relative_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload receipt: {str(e)}")


# ─── Helper Number Generators ───────────────────────────────────────────────

def generate_payment_voucher_no(db: Session, v_date: date) -> str:
    prefix = f"PV-{v_date.strftime('%Y%m%d')}-"
    count = db.query(func.count(CashPaymentVoucher.id)).filter(
        CashPaymentVoucher.voucher_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(4)}"


def generate_receipt_bill_no(db: Session, v_date: date) -> str:
    prefix = f"RV-{v_date.strftime('%Y%m%d')}-"
    count = db.query(func.count(CashReceiptVoucher.id)).filter(
        CashReceiptVoucher.bill_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(4)}"


def generate_rent_invoice_no(db: Session, v_date: date) -> str:
    prefix = f"RENT-{v_date.strftime('%Y%m%d')}-"
    count = db.query(func.count(RentBill.id)).filter(
        RentBill.invoice_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(4)}"


# ─── Next Auto Number Endpoints ─────────────────────────────────────────────

@router.get("/next-payment-voucher-no")
def get_next_payment_voucher_no(v_date: Optional[str] = None, db: Session = Depends(get_db)):
    d = date.fromisoformat(v_date) if v_date else date.today()
    return {"voucher_no": generate_payment_voucher_no(db, d)}


@router.get("/next-receipt-bill-no")
def get_next_receipt_bill_no(v_date: Optional[str] = None, db: Session = Depends(get_db)):
    d = date.fromisoformat(v_date) if v_date else date.today()
    return {"bill_no": generate_receipt_bill_no(db, d)}


@router.get("/next-rent-invoice-no")
def get_next_rent_invoice_no(v_date: Optional[str] = None, db: Session = Depends(get_db)):
    d = date.fromisoformat(v_date) if v_date else date.today()
    return {"invoice_no": generate_rent_invoice_no(db, d)}


# ─── 1. Cash Payment Vouchers ────────────────────────────────────────────────

@router.get("/payment-vouchers", response_model=List[CashPaymentVoucherOut])
def get_payment_vouchers(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashPaymentVoucher)
    if start_date:
        query = query.filter(CashPaymentVoucher.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(CashPaymentVoucher.date <= date.fromisoformat(end_date))
    return query.order_by(CashPaymentVoucher.created_at.desc()).all()


@router.post("/payment-vouchers", response_model=CashPaymentVoucherOut, status_code=201)
def create_payment_voucher(payload: CashPaymentVoucherCreate, db: Session = Depends(get_db)):
    v_no = payload.voucher_no or generate_payment_voucher_no(db, payload.date)
    record = CashPaymentVoucher(
        voucher_no=v_no,
        date=payload.date,
        paid_to=payload.paid_to,
        purpose_remarks=payload.purpose_remarks,
        details_of_expenditure=payload.details_of_expenditure,
        amount_rs=payload.amount_rs,
        amount_words=payload.amount_words,
        receipt_doc_path=payload.receipt_doc_path,
        payment_mode=payload.payment_mode or "CASH",
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        bank_name=payload.bank_name,
        created_by=payload.created_by,
        status=payload.status or "POSTED"
    )
    db.add(record)

    # ── Auto-Post to Cash Scroll Book ONLY if CASH payment mode ────────────────
    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    if not is_cheque:
        scroll_entry = CashScrollBookEntry(
            date=payload.date,
            voucher_no=v_no,
            from_received_paid=f"Paid To: {payload.paid_to}",
            received_amount=Decimal("0.00"),
            paid_amount=payload.amount_rs,
            cheque_amount=Decimal("0.00"),
            created_by=payload.created_by
        )
        db.add(scroll_entry)

    # ── Auto-Post to Cheque Issue Book if Cheque Mode ──────────────────────────
    if is_cheque and payload.cheque_no:
        cheque_entry = ChequeIssueBookEntry(
            issue_date=payload.cheque_date or payload.date,
            name_to_whom_issued=payload.paid_to,
            cheque_no=payload.cheque_no,
            amount_rs=payload.amount_rs,
            remarks=payload.purpose_remarks or f"Payment Voucher {v_no}",
            created_by=payload.created_by
        )
        db.add(cheque_entry)

    # ── Auto-Post to Main Transactions Table (Updates Debit Book & General Ledger)
    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=v_no,
        v_date=payload.date,
        customer_name=payload.paid_to,
        particulars=payload.details_of_expenditure or f"Payment Voucher: {payload.paid_to}",
        nature="DEBIT",
        total_amount=payload.amount_rs,
        remarks=payload.purpose_remarks or f"Payment Voucher {v_no}",
        created_by=payload.created_by,
        target_account_name="Sundrey A/C"
    )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/payment-vouchers/{id}")
def delete_payment_voucher(id: int, db: Session = Depends(get_db)):
    record = db.query(CashPaymentVoucher).filter(CashPaymentVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
    delete_transaction_for_cashier_voucher(db, record.voucher_no)
    db.query(CashScrollBookEntry).filter(CashScrollBookEntry.voucher_no == record.voucher_no).delete()
    if record.cheque_no:
        db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.cheque_no == record.cheque_no).delete()
    db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.remarks.like(f"%{record.voucher_no}%")).delete()
    db.delete(record)
    db.commit()
    return {"message": "Payment voucher deleted successfully"}


# ─── 2. Cash Receipt Vouchers ────────────────────────────────────────────────

@router.get("/receipt-vouchers", response_model=List[CashReceiptVoucherOut])
def get_receipt_vouchers(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashReceiptVoucher)
    if start_date:
        query = query.filter(CashReceiptVoucher.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(CashReceiptVoucher.date <= date.fromisoformat(end_date))
    return query.order_by(CashReceiptVoucher.created_at.desc()).all()


@router.post("/receipt-vouchers", response_model=CashReceiptVoucherOut, status_code=201)
def create_receipt_voucher(payload: CashReceiptVoucherCreate, db: Session = Depends(get_db)):
    b_no = payload.bill_no or generate_receipt_bill_no(db, payload.date)
    record = CashReceiptVoucher(
        bill_no=b_no,
        date=payload.date,
        gst_no=payload.gst_no,
        phone_no=payload.phone_no,
        received_from=payload.received_from,
        particulars=payload.particulars,
        loan_amount=payload.loan_amount,
        interest_amount=payload.interest_amount,
        total_amount=payload.total_amount,
        receipt_doc_path=payload.receipt_doc_path,
        payment_mode=payload.payment_mode or "CASH",
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        bank_name=payload.bank_name,
        created_by=payload.created_by,
        status=payload.status or "POSTED"
    )
    db.add(record)

    # ── Auto-Post to Cash Scroll Book ──────────────────────────────────────────
    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    rec_amt = payload.total_amount if not is_cheque else Decimal("0.00")
    cheque_amt = payload.total_amount if is_cheque else Decimal("0.00")

    scroll_entry = CashScrollBookEntry(
        date=payload.date,
        voucher_no=b_no,
        from_received_paid=f"Received From: {payload.received_from}",
        received_amount=rec_amt,
        paid_amount=Decimal("0.00"),
        cheque_amount=cheque_amt,
        created_by=payload.created_by
    )
    db.add(scroll_entry)

    # ── Auto-Post to Cheque Issue Book if Cheque Mode ──────────────────────────
    if is_cheque and payload.cheque_no:
        cheque_entry = ChequeIssueBookEntry(
            issue_date=payload.cheque_date or payload.date,
            name_to_whom_issued=payload.received_from,
            cheque_no=payload.cheque_no,
            amount_rs=payload.total_amount,
            remarks=payload.particulars or f"Receipt Voucher {b_no}",
            created_by=payload.created_by
        )
        db.add(cheque_entry)

    # ── Auto-Post to Main Transactions Table (Updates Credit Book & General Ledger)
    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=b_no,
        v_date=payload.date,
        customer_name=payload.received_from,
        particulars=payload.particulars or f"Receipt Voucher: {payload.received_from}",
        nature="CREDIT",
        total_amount=payload.total_amount,
        remarks=f"Receipt Voucher {b_no}",
        created_by=payload.created_by,
        target_account_name="Sundrey A/C"
    )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/receipt-vouchers/{id}")
def delete_receipt_voucher(id: int, db: Session = Depends(get_db)):
    record = db.query(CashReceiptVoucher).filter(CashReceiptVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Receipt voucher not found")
    delete_transaction_for_cashier_voucher(db, record.bill_no)
    db.delete(record)
    db.commit()
    return {"message": "Receipt voucher deleted successfully"}


# ─── 3. Rent Bills ───────────────────────────────────────────────────────────

@router.get("/rent-bills", response_model=List[RentBillOut])
def get_rent_bills(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RentBill)
    if start_date:
        query = query.filter(RentBill.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(RentBill.date <= date.fromisoformat(end_date))
    return query.order_by(RentBill.created_at.desc()).all()


@router.post("/rent-bills", response_model=RentBillOut, status_code=201)
def create_rent_bill(payload: RentBillCreate, db: Session = Depends(get_db)):
    inv_no = payload.invoice_no or generate_rent_invoice_no(db, payload.date)
    record = RentBill(
        invoice_no=inv_no,
        date=payload.date,
        consignee_name=payload.consignee_name,
        consignee_address=payload.consignee_address,
        particulars=payload.particulars,
        hsn_sac=payload.hsn_sac or "997212",
        gst_rate=payload.gst_rate,
        qty=payload.qty,
        rate=payload.rate,
        per=payload.per or "Month",
        amount=payload.amount,
        igst_amount=payload.igst_amount,
        sgst_amount=payload.sgst_amount,
        cgst_amount=payload.cgst_amount,
        total_amount=payload.total_amount,
        tax_amount_words=payload.tax_amount_words,
        payment_mode=payload.payment_mode or "CASH",
        cheque_no=payload.cheque_no,
        cheque_date=payload.cheque_date,
        bank_name=payload.bank_name,
        created_by=payload.created_by,
        status=payload.status or "POSTED"
    )
    db.add(record)

    # ── Auto-Post to Cash Scroll Book ──────────────────────────────────────────
    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    rec_amt = payload.total_amount if not is_cheque else Decimal("0.00")
    cheque_amt = payload.total_amount if is_cheque else Decimal("0.00")

    scroll_entry = CashScrollBookEntry(
        date=payload.date,
        voucher_no=inv_no,
        from_received_paid=f"Rent Bill: {payload.consignee_name}",
        received_amount=rec_amt,
        paid_amount=Decimal("0.00"),
        cheque_amount=cheque_amt,
        created_by=payload.created_by
    )
    db.add(scroll_entry)

    # ── Auto-Post to Cheque Issue Book if Cheque Mode ──────────────────────────
    if is_cheque and payload.cheque_no:
        cheque_entry = ChequeIssueBookEntry(
            issue_date=payload.cheque_date or payload.date,
            name_to_whom_issued=payload.consignee_name,
            cheque_no=payload.cheque_no,
            amount_rs=payload.total_amount,
            remarks=payload.particulars or f"Rent Bill {inv_no}",
            created_by=payload.created_by
        )
        db.add(cheque_entry)

    # ── Auto-Post to Main Transactions Table (Updates Credit Book & General Ledger)
    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=inv_no,
        v_date=payload.date,
        customer_name=payload.consignee_name,
        particulars=f"Rent Bill: {payload.particulars or 'Building Rent'}",
        nature="CREDIT",
        total_amount=payload.total_amount,
        remarks=f"Rent Invoice {inv_no}",
        created_by=payload.created_by,
        target_account_name="Rent"
    )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/rent-bills/{id}")
def delete_rent_bill(id: int, db: Session = Depends(get_db)):
    record = db.query(RentBill).filter(RentBill.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Rent bill not found")
    delete_transaction_for_cashier_voucher(db, record.invoice_no)
    db.delete(record)
    db.commit()
    return {"message": "Rent bill deleted successfully"}


# ─── 4. Cash Scroll Book ─────────────────────────────────────────────────────

@router.get("/cash-scroll-entries", response_model=List[CashScrollBookOut])
def get_cash_scroll_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashScrollBookEntry)
    if start_date:
        query = query.filter(CashScrollBookEntry.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(CashScrollBookEntry.date <= date.fromisoformat(end_date))
    return query.order_by(CashScrollBookEntry.created_at.desc()).all()


@router.post("/cash-scroll-entries", response_model=CashScrollBookOut, status_code=201)
def create_cash_scroll_entry(payload: CashScrollBookCreate, db: Session = Depends(get_db)):
    record = CashScrollBookEntry(
        date=payload.date,
        page_no=payload.page_no,
        voucher_no=payload.voucher_no,
        from_received_paid=payload.from_received_paid,
        received_amount=payload.received_amount,
        paid_amount=payload.paid_amount,
        cheque_amount=payload.cheque_amount,
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/cash-scroll-entries/{id}")
def delete_cash_scroll_entry(id: int, db: Session = Depends(get_db)):
    record = db.query(CashScrollBookEntry).filter(CashScrollBookEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cash scroll entry not found")
    db.delete(record)
    db.commit()
    return {"message": "Cash scroll entry deleted successfully"}


# ─── 5. Cheque Issue Book ─────────────────────────────────────────────────────

@router.get("/cheque-issue-entries", response_model=List[ChequeIssueBookOut])
def get_cheque_issue_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ChequeIssueBookEntry)
    if start_date:
        query = query.filter(ChequeIssueBookEntry.issue_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(ChequeIssueBookEntry.issue_date <= date.fromisoformat(end_date))
    return query.order_by(ChequeIssueBookEntry.created_at.desc()).all()


@router.post("/cheque-issue-entries", response_model=ChequeIssueBookOut, status_code=201)
def create_cheque_issue_entry(payload: ChequeIssueBookCreate, db: Session = Depends(get_db)):
    record = ChequeIssueBookEntry(
        issue_date=payload.issue_date,
        name_to_whom_issued=payload.name_to_whom_issued,
        cheque_no=payload.cheque_no,
        amount_rs=payload.amount_rs,
        remarks=payload.remarks,
        created_by=payload.created_by
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/cheque-issue-entries/{id}")
def delete_cheque_issue_entry(id: int, db: Session = Depends(get_db)):
    record = db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cheque issue entry not found")
    db.delete(record)
    db.commit()
    return {"message": "Cheque issue entry deleted successfully"}


@router.put("/payment-vouchers/{id}", response_model=CashPaymentVoucherOut)
def update_payment_voucher(id: int, payload: CashPaymentVoucherCreate, db: Session = Depends(get_db)):
    record = db.query(CashPaymentVoucher).filter(CashPaymentVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
    
    old_vno = record.voucher_no
    old_cheque_no = record.cheque_no

    record.paid_to = payload.paid_to
    record.purpose_remarks = payload.purpose_remarks
    record.details_of_expenditure = payload.details_of_expenditure
    record.amount_rs = payload.amount_rs
    record.amount_words = payload.amount_words
    record.payment_mode = payload.payment_mode or "CASH"
    record.cheque_no = payload.cheque_no
    record.cheque_date = payload.cheque_date
    record.bank_name = payload.bank_name

    is_cheque = (record.payment_mode or "CASH").upper() == "CHEQUE"

    # 1. Sync CashScrollBookEntry (Cheque transaction MUST NOT be shown in cash scroll book!)
    scroll = db.query(CashScrollBookEntry).filter(CashScrollBookEntry.voucher_no == old_vno).first()
    if is_cheque:
        if scroll:
            db.delete(scroll)
    else:
        if scroll:
            scroll.date = payload.date
            scroll.from_received_paid = f"Paid To: {payload.paid_to}"
            scroll.paid_amount = payload.amount_rs
            scroll.received_amount = Decimal("0.00")
            scroll.cheque_amount = Decimal("0.00")
        else:
            db.add(CashScrollBookEntry(
                date=payload.date,
                voucher_no=old_vno,
                from_received_paid=f"Paid To: {payload.paid_to}",
                received_amount=Decimal("0.00"),
                paid_amount=payload.amount_rs,
                cheque_amount=Decimal("0.00"),
                created_by=payload.created_by or record.created_by
            ))

    # 2. Sync ChequeIssueBookEntry
    chq_entry = None
    if old_cheque_no:
        chq_entry = db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.cheque_no == old_cheque_no).first()
    if not chq_entry:
        chq_entry = db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.remarks.like(f"%{old_vno}%")).first()

    if is_cheque and payload.cheque_no:
        if chq_entry:
            chq_entry.issue_date = payload.cheque_date or payload.date
            chq_entry.name_to_whom_issued = payload.paid_to
            chq_entry.cheque_no = payload.cheque_no
            chq_entry.amount_rs = payload.amount_rs
            chq_entry.remarks = payload.purpose_remarks or f"Payment Voucher {old_vno}"
        else:
            db.add(ChequeIssueBookEntry(
                issue_date=payload.cheque_date or payload.date,
                name_to_whom_issued=payload.paid_to,
                cheque_no=payload.cheque_no,
                amount_rs=payload.amount_rs,
                remarks=payload.purpose_remarks or f"Payment Voucher {old_vno}",
                created_by=payload.created_by or record.created_by
            ))
    elif not is_cheque and chq_entry:
        db.delete(chq_entry)

    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=record.voucher_no,
        v_date=payload.date,
        customer_name=payload.paid_to,
        particulars=payload.details_of_expenditure or f"Payment Voucher: {payload.paid_to}",
        nature="DEBIT",
        total_amount=payload.amount_rs,
        remarks=payload.purpose_remarks or f"Payment Voucher {record.voucher_no}",
        created_by=payload.created_by or record.created_by,
        target_account_name="Sundrey A/C"
    )

    db.commit()
    db.refresh(record)
    return record


@router.put("/receipt-vouchers/{id}", response_model=CashReceiptVoucherOut)
def update_receipt_voucher(id: int, payload: CashReceiptVoucherCreate, db: Session = Depends(get_db)):
    record = db.query(CashReceiptVoucher).filter(CashReceiptVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Receipt voucher not found")
    record.gst_no = payload.gst_no
    record.phone_no = payload.phone_no
    record.received_from = payload.received_from
    record.particulars = payload.particulars
    record.loan_amount = payload.loan_amount
    record.interest_amount = payload.interest_amount
    record.total_amount = payload.total_amount
    record.payment_mode = payload.payment_mode or "CASH"
    record.cheque_no = payload.cheque_no
    record.cheque_date = payload.cheque_date
    record.bank_name = payload.bank_name

    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=record.bill_no,
        v_date=payload.date,
        customer_name=payload.received_from,
        particulars=payload.particulars or f"Receipt Voucher: {payload.received_from}",
        nature="CREDIT",
        total_amount=payload.total_amount,
        remarks=f"Receipt Voucher {record.bill_no}",
        created_by=payload.created_by or record.created_by,
        target_account_name="Sundrey A/C"
    )

    db.commit()
    db.refresh(record)
    return record


@router.put("/rent-bills/{id}", response_model=RentBillOut)
def update_rent_bill(id: int, payload: RentBillCreate, db: Session = Depends(get_db)):
    record = db.query(RentBill).filter(RentBill.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Rent bill not found")
    record.consignee_name = payload.consignee_name
    record.consignee_address = payload.consignee_address
    record.particulars = payload.particulars
    record.qty = payload.qty
    record.rate = payload.rate
    record.amount = payload.amount
    record.igst_amount = payload.igst_amount
    record.sgst_amount = payload.sgst_amount
    record.cgst_amount = payload.cgst_amount
    record.total_amount = payload.total_amount
    record.payment_mode = payload.payment_mode or "CASH"
    record.cheque_no = payload.cheque_no
    record.cheque_date = payload.cheque_date
    record.bank_name = payload.bank_name

    sync_transaction_for_cashier_voucher(
        db=db,
        memo_no=record.invoice_no,
        v_date=payload.date,
        customer_name=payload.consignee_name,
        particulars=f"Rent Bill: {payload.particulars or 'Building Rent'}",
        nature="CREDIT",
        total_amount=payload.total_amount,
        remarks=f"Rent Invoice {record.invoice_no}",
        created_by=payload.created_by or record.created_by,
        target_account_name="Rent"
    )

    db.commit()
    db.refresh(record)
    return record


# ─── 6. Cashier Audit Summary ───────────────────────────────────────────────

@router.get("/audit-summary", response_model=CashierAuditSummary)
def get_cashier_audit_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        sd = date.fromisoformat(start_date) if (start_date and start_date.strip()) else date(2020, 1, 1)
    except Exception:
        sd = date(2020, 1, 1)

    try:
        ed = date.fromisoformat(end_date) if (end_date and end_date.strip()) else date(2035, 12, 31)
    except Exception:
        ed = date(2035, 12, 31)

    if sd > ed:
        sd, ed = ed, sd

    # 1. Payment Vouchers
    pv_q = db.query(
        func.count(CashPaymentVoucher.id),
        func.coalesce(func.sum(CashPaymentVoucher.amount_rs), 0)
    ).filter(CashPaymentVoucher.date >= sd, CashPaymentVoucher.date <= ed).first()
    pv_count, pv_amt = pv_q if pv_q else (0, 0)

    # 2. Receipt Vouchers
    rv_q = db.query(
        func.count(CashReceiptVoucher.id),
        func.coalesce(func.sum(CashReceiptVoucher.total_amount), 0)
    ).filter(CashReceiptVoucher.date >= sd, CashReceiptVoucher.date <= ed).first()
    rv_count, rv_amt = rv_q if rv_q else (0, 0)

    # 3. Rent Bills
    rb_q = db.query(
        func.count(RentBill.id),
        func.coalesce(func.sum(RentBill.total_amount), 0)
    ).filter(RentBill.date >= sd, RentBill.date <= ed).first()
    rb_count, rb_amt = rb_q if rb_q else (0, 0)

    # 4. Cash Scroll
    cs_q = db.query(
        func.coalesce(func.sum(CashScrollBookEntry.received_amount), 0),
        func.coalesce(func.sum(CashScrollBookEntry.paid_amount), 0),
        func.coalesce(func.sum(CashScrollBookEntry.cheque_amount), 0)
    ).filter(CashScrollBookEntry.date >= sd, CashScrollBookEntry.date <= ed).first()
    cs_rec, cs_paid, cs_chq = cs_q if cs_q else (0, 0, 0)

    # 5. Cheque Issue
    ci_q = db.query(
        func.count(ChequeIssueBookEntry.id),
        func.coalesce(func.sum(ChequeIssueBookEntry.amount_rs), 0)
    ).filter(ChequeIssueBookEntry.issue_date >= sd, ChequeIssueBookEntry.issue_date <= ed).first()
    ci_count, ci_amt = ci_q if ci_q else (0, 0)

    return CashierAuditSummary(
        start_date=sd.isoformat(),
        end_date=ed.isoformat(),
        total_payment_vouchers_count=pv_count,
        total_payment_amount=Decimal(str(pv_amt)),
        total_receipt_vouchers_count=rv_count,
        total_receipt_amount=Decimal(str(rv_amt)),
        total_rent_bills_count=rb_count,
        total_rent_amount=Decimal(str(rb_amt)),
        total_cash_scroll_received=Decimal(str(cs_rec)),
        total_cash_scroll_paid=Decimal(str(cs_paid)),
        total_cheques_issued_count=ci_count,
        total_cheques_amount=Decimal(str(ci_amt)),
    )


# ─── 7. Cashier 30 Days Test Data Generator ──────────────────────────────────

from datetime import timedelta
import random

@router.post("/generate-30-days-test-data")
def generate_30_days_cashier_test_data(db: Session = Depends(get_db)):
    today_dt = date.today()
    payees = ["Avinash Suregaonkar", "Ramesh Patil", "Society Supplier", "Electric Board", "Water Supply Dept"]
    receipt_sources = ["Avinash Suregaonkar", "Farmer Member Collection", "Fertilizer Sales Collection", "Cold Storage Charges"]
    rent_tenants = ["Karnataka Seed Depot", "Agri Tool Services", "Pesticide Retail Agency", "Farmer Producer Co."]

    pv_count = 0
    rv_count = 0
    rb_count = 0

    for i in range(30):
        entry_date = today_dt - timedelta(days=i)
        rnd_tag = random.randint(1000, 9999)

        # 1. Cash Payment Voucher
        p_amt = Decimal(str(random.randint(500, 5000)))
        is_chq_pv = (i % 3 == 0)
        pv_vno = f"PV-{entry_date.strftime('%Y%m%d')}-{i+1:02d}-{rnd_tag}"

        pv = CashPaymentVoucher(
            voucher_no=pv_vno,
            date=entry_date,
            paid_to=payees[i % len(payees)],
            purpose_remarks="Office & Shop Operating Expenses",
            details_of_expenditure="General Maintenance & Field Expenses",
            amount_rs=p_amt,
            amount_words=f"Rupees {int(p_amt)} Only",
            payment_mode="CHEQUE" if is_chq_pv else "CASH",
            cheque_no=f"CHQ-{rnd_tag}" if is_chq_pv else None,
            cheque_date=entry_date if is_chq_pv else None,
            bank_name="State Bank of India" if is_chq_pv else None,
            created_by="Test Generator",
            status="POSTED"
        )
        db.add(pv)
        pv_count += 1

        # Auto-post PV to Cash Scroll (ONLY if CASH) & Cheque Issue (if CHEQUE)
        if not is_chq_pv:
            db.add(CashScrollBookEntry(
                date=entry_date,
                voucher_no=pv_vno,
                from_received_paid=f"Paid To: {pv.paid_to}",
                received_amount=Decimal("0.00"),
                paid_amount=p_amt,
                cheque_amount=Decimal("0.00"),
                created_by="Test Generator"
            ))
        else:
            db.add(ChequeIssueBookEntry(
                issue_date=entry_date,
                name_to_whom_issued=pv.paid_to,
                cheque_no=f"CHQ-{rnd_tag}",
                amount_rs=p_amt,
                remarks=f"Payment Voucher {pv_vno}",
                created_by="Test Generator"
            ))

        # 2. Cash Receipt Voucher
        r_amt = Decimal(str(random.randint(1000, 12000)))
        is_chq_rv = (i % 4 == 0)
        rv_bno = f"RV-{entry_date.strftime('%Y%m%d')}-{i+1:02d}-{rnd_tag}"

        rv = CashReceiptVoucher(
            bill_no=rv_bno,
            date=entry_date,
            gst_no="29AAAAA0000A1Z5",
            phone_no="9876543210",
            received_from=receipt_sources[i % len(receipt_sources)],
            particulars="Fertilizer & Pesticide Recovery Collection",
            loan_amount=r_amt,
            interest_amount=Decimal("0.00"),
            total_amount=r_amt,
            payment_mode="CHEQUE" if is_chq_rv else "CASH",
            cheque_no=f"CHQ-{rnd_tag+1}" if is_chq_rv else None,
            cheque_date=entry_date if is_chq_rv else None,
            bank_name="Canara Bank" if is_chq_rv else None,
            created_by="Test Generator",
            status="POSTED"
        )
        db.add(rv)
        rv_count += 1

        # Auto-post RV to Cash Scroll
        db.add(CashScrollBookEntry(
            date=entry_date,
            voucher_no=rv_bno,
            from_received_paid=f"Received From: {rv.received_from}",
            received_amount=r_amt if not is_chq_rv else Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            cheque_amount=r_amt if is_chq_rv else Decimal("0.00"),
            created_by="Test Generator"
        ))

        # 3. Rent Bill
        rent_base = Decimal(str(random.randint(3000, 8000)))
        sgst = rent_base * Decimal("0.09")
        cgst = rent_base * Decimal("0.09")
        tot_rent = rent_base + sgst + cgst
        rb_vno = f"RENT-{entry_date.strftime('%Y%m%d')}-{i+1:02d}-{rnd_tag}"

        rb = RentBill(
            invoice_no=rb_vno,
            date=entry_date,
            consignee_name=rent_tenants[i % len(rent_tenants)],
            consignee_address="Shop Premises Market Yard, Belgaum",
            particulars="Godown & Cold Storage Shop Monthly Rent",
            hsn_sac="997212",
            gst_rate=Decimal("18.00"),
            qty=Decimal("1.00"),
            rate=rent_base,
            per="Month",
            amount=rent_base,
            sgst_amount=sgst,
            cgst_amount=cgst,
            total_amount=tot_rent,
            payment_mode="CASH",
            created_by="Test Generator",
            status="POSTED"
        )
        db.add(rb)
        rb_count += 1

        # Auto-post Rent Bill to Cash Scroll
        db.add(CashScrollBookEntry(
            date=entry_date,
            voucher_no=rb_vno,
            from_received_paid=f"Rent Bill: {rb.consignee_name}",
            received_amount=tot_rent,
            paid_amount=Decimal("0.00"),
            cheque_amount=Decimal("0.00"),
            created_by="Test Generator"
        ))

    db.commit()

    return {
        "message": "Successfully generated 30 days of cashier test data across all cashier forms!",
        "payment_vouchers": pv_count,
        "receipt_vouchers": rv_count,
        "rent_bills": rb_count
    }


@router.delete("/delete-test-data")
def delete_cashier_test_data(db: Session = Depends(get_db)):
    pv_del = db.query(CashPaymentVoucher).filter(CashPaymentVoucher.created_by == "Test Generator").delete()
    rv_del = db.query(CashReceiptVoucher).filter(CashReceiptVoucher.created_by == "Test Generator").delete()
    rb_del = db.query(RentBill).filter(RentBill.created_by == "Test Generator").delete()
    cs_del = db.query(CashScrollBookEntry).filter(CashScrollBookEntry.created_by == "Test Generator").delete()
    ci_del = db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.created_by == "Test Generator").delete()

    db.commit()

    return {
        "message": "Successfully deleted cashier test data!",
        "payment_vouchers_deleted": pv_del,
        "receipt_vouchers_deleted": rv_del,
        "rent_bills_deleted": rb_del,
        "cash_scroll_entries_deleted": cs_del,
        "cheque_issues_deleted": ci_del
    }

