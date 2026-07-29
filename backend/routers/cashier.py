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
    ChequeIssueBookEntry
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

    # ── Auto-Post to Cash Scroll Book ──────────────────────────────────────────
    is_cheque = (payload.payment_mode or "CASH").upper() == "CHEQUE"
    paid_amt = payload.amount_rs if not is_cheque else Decimal("0.00")
    cheque_amt = payload.amount_rs if is_cheque else Decimal("0.00")

    scroll_entry = CashScrollBookEntry(
        date=payload.date,
        voucher_no=v_no,
        from_received_paid=f"Paid To: {payload.paid_to}",
        received_amount=Decimal("0.00"),
        paid_amount=paid_amt,
        cheque_amount=cheque_amt,
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

    db.commit()
    db.refresh(record)
    return record


@router.delete("/payment-vouchers/{id}")
def delete_payment_voucher(id: int, db: Session = Depends(get_db)):
    record = db.query(CashPaymentVoucher).filter(CashPaymentVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payment voucher not found")
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

    db.commit()
    db.refresh(record)
    return record



@router.delete("/receipt-vouchers/{id}")
def delete_receipt_voucher(id: int, db: Session = Depends(get_db)):
    record = db.query(CashReceiptVoucher).filter(CashReceiptVoucher.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Receipt voucher not found")
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

    db.commit()
    db.refresh(record)
    return record



@router.delete("/rent-bills/{id}")
def delete_rent_bill(id: int, db: Session = Depends(get_db)):
    record = db.query(RentBill).filter(RentBill.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Rent bill not found")
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


# ─── 6. Cashier Audit Summary ───────────────────────────────────────────────

@router.get("/audit-summary", response_model=CashierAuditSummary)
def get_cashier_audit_summary(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    sd = date.fromisoformat(start_date)
    ed = date.fromisoformat(end_date)

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
        start_date=start_date,
        end_date=end_date,
        total_payment_vouchers_count=pv_count,
        total_payment_amount=Decimal(str(pv_amt)),
        total_receipt_vouchers_count=rv_count,
        total_receipt_amount=Decimal(str(rv_amt)),
        total_rent_bills_count=rb_count,
        total_rent_bill_amount=Decimal(str(rb_amt)),
        total_scroll_received=Decimal(str(cs_rec)),
        total_scroll_paid=Decimal(str(cs_paid)),
        total_scroll_cheque=Decimal(str(cs_chq)),
        total_cheques_issued_count=ci_count,
        total_cheques_issued_amount=Decimal(str(ci_amt)),
    )
