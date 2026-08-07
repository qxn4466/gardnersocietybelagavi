import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal
from database import get_db
from models import Transaction, TransactionTypeMaster
from schemas import CashBookRow

router = APIRouter(prefix="/cashbook", tags=["cashbook"])

# Column name → field name mapping
COLUMN_FIELD_MAP = {
    "Shares": "shares",
    "Purchases": "purchases",
    "Commissions": "commissions",
    "Loan a/c": "loan_ac",
    "Interest": "interest",
    "Pigmi Comm.": "pigmi_comm",
    "Bank Current": "bank_current",
    "Advance": "advance",
    "Lakshmi Pigmi Deposit": "lakshmi_pigmi_deposit",
    "Vegetable Comm.": "vegetable_comm",
    "Sundary a/c": "sundary_ac",
    "Cash Sales": "cash_sales",
    "Pesticide Sales": "pesticide_sales",
    "Cold Storage Adv": "cold_storage_adv",
    "Lakshmi Pigmi Deposit Loan": "lakshmi_pigmi_deposit_loan",
    "Lakshmi Pigmi Deposit Interest": "lakshmi_pigmi_deposit_interest",
}


def parse_tax_amounts(particulars: str):
    cgst_9 = Decimal("0")
    sgst_9 = Decimal("0")
    cgst_2_5 = Decimal("0")
    sgst_2_5 = Decimal("0")

    if not particulars:
        return cgst_9, sgst_9, cgst_2_5, sgst_2_5

    # Match CGST/SGST 9%
    c9 = re.search(r'CGST\s*(?:\(9%\)|9%)\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
    if c9:
        try: cgst_9 = Decimal(c9.group(1))
        except: pass

    s9 = re.search(r'SGST\s*(?:\(9%\)|9%)\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
    if s9:
        try: sgst_9 = Decimal(s9.group(1))
        except: pass

    # Match CGST/SGST 2.5%
    c25 = re.search(r'CGST\s*(?:\(2\.5%\)|2\.5%)\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
    if c25:
        try: cgst_2_5 = Decimal(c25.group(1))
        except: pass

    s25 = re.search(r'SGST\s*(?:\(2\.5%\)|2\.5%)\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
    if s25:
        try: sgst_2_5 = Decimal(s25.group(1))
        except: pass

    # Fallback: general CGST / SGST note if no explicit percentage match
    if cgst_9 == 0 and cgst_2_5 == 0:
        c_gen = re.search(r'CGST\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
        if c_gen:
            try: cgst_2_5 = Decimal(c_gen.group(1))
            except: pass

    if sgst_9 == 0 and sgst_2_5 == 0:
        s_gen = re.search(r'SGST\s*:\s*Rs\.?\s*([\d\.]+)', particulars, re.IGNORECASE)
        if s_gen:
            try: sgst_2_5 = Decimal(s_gen.group(1))
            except: pass

    return cgst_9, sgst_9, cgst_2_5, sgst_2_5


@router.get("/", response_model=List[CashBookRow])
def get_cashbook(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    book_type: Optional[str] = None,  # "CREDIT" or "DEBIT"
    db: Session = Depends(get_db)
):
    """Return daily cash/credit/debit book rows. Defaults to today if no date given."""
    today = date.today()
    sd = date.fromisoformat(start_date) if start_date else today
    ed = date.fromisoformat(end_date) if end_date else today

    query = db.query(Transaction).filter(
        Transaction.date >= sd,
        Transaction.date <= ed,
        Transaction.status == "POSTED"
    )

    if book_type and book_type.upper() in ["CREDIT", "DEBIT"]:
        query = query.filter(Transaction.entry_nature == book_type.upper())

    transactions = query.order_by(Transaction.date, Transaction.id).all()

    rows: List[CashBookRow] = []
    daily_serial: dict = {}  # date → counter for LF No

    for txn in transactions:
        txn_date_str = txn.date.strftime("%Y-%m-%d")
        daily_serial[txn_date_str] = daily_serial.get(txn_date_str, 0) + 1
        lf_no = str(daily_serial[txn_date_str]).zfill(3)

        amount = txn.amount_rs + (txn.amount_ps / 100)
        cash_book_col = txn.transaction_type.cash_book_column if txn.transaction_type else ""
        field_name = COLUMN_FIELD_MAP.get(cash_book_col, "") or "sundary_ac"

        cgst_9, sgst_9, cgst_2_5, sgst_2_5 = parse_tax_amounts(txn.particulars or "")

        row_data = {
            "id": txn.id,
            "date": txn.date,
            "customer_id": txn.customer_id or "",
            "lf_no": lf_no,
            "name": txn.customer_name,
            "particulars": txn.particulars or "",
            "cash_memo_no": txn.cash_memo_no,
            "transaction_type": txn.transaction_type.name if txn.transaction_type else "",
            "cash_book_column": cash_book_col,
            "amount": amount,
            "cgst_9": cgst_9,
            "sgst_9": sgst_9,
            "cgst_2_5": cgst_2_5,
            "sgst_2_5": sgst_2_5,
            "total": amount,
        }

        # Set the correct column to amount, all others remain 0
        if field_name:
            row_data[field_name] = amount

        rows.append(CashBookRow(**row_data))

    return rows
