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

MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

@router.get("/", response_model=List[LedgerRow])
def get_ledger(
    month: Optional[int] = None,
    year: Optional[int] = None,
    account: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Return general ledger rows grouped by (year, month, ledger_account, entry_nature).
    Shows all POSTED transactions in a monthly breakdown for yearly ledger view.
    """
    q = (
        db.query(
            extract("year",  Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
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
        extract("year",  Transaction.date),
        extract("month", Transaction.date),
        TransactionTypeMaster.ledger_account,
        Transaction.entry_nature,
    ).order_by(
        extract("year",  Transaction.date),
        extract("month", Transaction.date),
        TransactionTypeMaster.ledger_account,
        Transaction.entry_nature,
    )

    results = q.all()

    # Accounts that are naturally DEBIT (outgoing/expenses)
    DEBIT_ACCOUNTS    = {"Purchases", "Cold Storage Adv", "Lakshmi Pigmi Deposit Interest"}
    PAYABLE_ACCOUNTS  = {"Loan a/c", "Bank Current"}
    RECEIVABLE_ACCOUNTS = {"Advance", "Lakshmi Pigmi Deposit Loan"}

    rows: List[LedgerRow] = []
    for r in results:
        yr   = int(r.yr)
        mo   = int(r.mo)
        acc  = r.account
        nature = r.nature
        total  = Decimal(str(r.total or 0))

        label = f"{MONTH_NAMES[mo]} {yr}"

        # For Sundrey A/C, distinguish credit vs debit
        account_display = acc
        if acc and acc.lower() in ("sundary a/c", "sundrey a/c", "sundry a/c"):
            account_display = f"Sundrey A/C ({'Credit / Receipt' if nature == 'CREDIT' else 'Debit / Payment'})"

        receipt    = Decimal("0")
        debit      = Decimal("0")
        payable    = Decimal("0")
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
            account=account_display,
            receipt=receipt,
            debit=debit,
            payable=payable,
            receivable=receivable,
        ))

    return rows
