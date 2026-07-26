from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from decimal import Decimal
from calendar import month_name
from database import get_db
from models import Transaction, TransactionTypeMaster
from schemas import LedgerRow

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/", response_model=List[LedgerRow])
def get_ledger(
    month: Optional[int] = None,
    year: Optional[int] = None,
    account: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Return monthly general ledger rows.
    Groups by (year, month, ledger_account, entry_nature).
    
    Classification Rules:
    - RECEIPT (Credit Inflows): Shares, Sales, Commission, Interest, Sundry (Credit)
    - DEBIT (Outflows / Expenses): Purchases, Cold Storage Adv, Lakshmi Pigmi Deposit Interest, Sundry (Debit)
    - PAYABLE (Liabilities Owed): Loan a/c, Bank Current, Lakshmi Pigmi Deposit
    - RECEIVABLE (Assets Owed to Society): Advance, Lakshmi Pigmi Deposit Loan
    """
    q = (
        db.query(
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            TransactionTypeMaster.ledger_account.label("account"),
            Transaction.entry_nature.label("nature"),
            func.sum(Transaction.amount_rs + Transaction.amount_ps / 100).label("total"),
        )
        .join(TransactionTypeMaster, Transaction.transaction_type_id == TransactionTypeMaster.id)
    )

    q = q.filter(Transaction.status == "POSTED")

    if month:
        q = q.filter(extract("month", Transaction.date) == month)
    if year:
        q = q.filter(extract("year", Transaction.date) == year)
    if account:
        q = q.filter(TransactionTypeMaster.ledger_account == account)

    q = q.group_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
        TransactionTypeMaster.ledger_account,
        Transaction.entry_nature,
    ).order_by(
        extract("year", Transaction.date),
        extract("month", Transaction.date),
        TransactionTypeMaster.ledger_account,
        Transaction.entry_nature,
    )

    results = q.all()

    RECEIPT_ACCOUNTS = {
        "Shares", "Commission", "Pigmi Comm.", "Vegetable Comm.",
        "Cash Sales", "Pesticide Sales", "Interest", "Lakshmi Pigmi Deposit"
    }
    DEBIT_ACCOUNTS = {"Purchases", "Cold Storage Adv", "Lakshmi Pigmi Deposit Interest"}
    PAYABLE_ACCOUNTS = {"Loan a/c", "Bank Current"}
    RECEIVABLE_ACCOUNTS = {"Advance", "Lakshmi Pigmi Deposit Loan"}

    rows: List[LedgerRow] = []
    for r in results:
        yr, mo, acc, nature, total = int(r.year), int(r.month), r.account, r.nature, Decimal(str(r.total or 0))
        label = f"{month_name[mo]} {yr}"

        account_display_name = acc
        if acc == "Sundary a/c":
            account_display_name = f"Sundary a/c ({'Credit' if nature == 'CREDIT' else 'Debit'})"

        receipt = Decimal("0")
        debit = Decimal("0")
        payable = Decimal("0")
        receivable = Decimal("0")

        if nature == "CREDIT":
            receipt = total
        elif nature == "DEBIT":
            debit = total
            if acc in PAYABLE_ACCOUNTS:
                payable = total
            elif acc in RECEIVABLE_ACCOUNTS:
                receivable = total

        rows.append(LedgerRow(
            month=mo,
            year=yr,
            month_year_label=label,
            account=account_display_name,
            receipt=receipt,
            debit=debit,
            payable=payable,
            receivable=receivable,
        ))

    return rows
