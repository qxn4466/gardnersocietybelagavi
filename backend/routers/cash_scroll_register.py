from collections import defaultdict
from datetime import date
from decimal import Decimal
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import exists, func, or_, select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from database import get_db
from models import (
    AccountMaster, CashScrollBookEntry, CashScrollOpeningBalance, RentBill,
    SystemBalanceSetting, Transaction, TransactionTypeMaster,
)
from routers.auth import require_transaction_user
from schemas import CashScrollDay, CashScrollOpeningBalanceInput, CashScrollRegister, CashScrollRegisterEntry

router = APIRouter(prefix="/cashier", tags=["cashier"])
ZERO = Decimal("0.00")
SERIAL = re.compile(r"(?:(?:BGS|PV|RV|RENT)-[0-9]{8}-)?([0-9]{1,4})")
FORM_ITEM_AMOUNT = re.compile(r": Rs\.[+-]?[0-9]+\.[0-9]*(?= \| | — |$)")
FORM_TAX_NOTE = re.compile(r" — (?=(?:CGST|SGST) \()")


def get_account(db: Session, account_id: int | None) -> AccountMaster | None:
    if account_id is None:
        return None
    account = db.get(AccountMaster, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.get("/cash-scroll-register", response_model=CashScrollRegister)
def get_register(start_date: date, end_date: date, account_id: int | None = None, db: Session = Depends(get_db)):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="Start date must be on or before end date")
    account = get_account(db, account_id)
    setting = db.get(CashScrollOpeningBalance, f"account:{account.id}" if account else "cash")
    starting_balance = None
    if setting:
        starting_balance = CashScrollOpeningBalanceInput(balance_date=setting.balance_date, amount=setting.amount)
    elif account is None:
        legacy = db.query(SystemBalanceSetting).order_by(SystemBalanceSetting.id).first()
        if legacy:
            starting_balance = CashScrollOpeningBalanceInput(
                balance_date=legacy.initial_balance_date, amount=legacy.initial_opening_balance
            )

    # Rent scroll rows may use the printed bill number instead of the transaction's invoice number.
    rent_reference = exists().where(
        RentBill.invoice_no == Transaction.cash_memo_no,
        RentBill.bill_no == CashScrollBookEntry.voucher_no,
        RentBill.date == CashScrollBookEntry.date,
        CashScrollBookEntry.from_received_paid.startswith("Rent Bill:"),
    ).correlate(Transaction, CashScrollBookEntry)
    transaction_id = (
        select(Transaction.id)
        .where(
            Transaction.status == "POSTED",
            Transaction.date == CashScrollBookEntry.date,
            or_(Transaction.cash_memo_no == CashScrollBookEntry.voucher_no, rent_reference),
        )
        .order_by((Transaction.cash_memo_no == CashScrollBookEntry.voucher_no).desc(), Transaction.id.desc())
        .limit(1)
        .correlate(CashScrollBookEntry)
        .scalar_subquery()
    )
    entries = db.query(CashScrollBookEntry)
    matched_entries = entries.outerjoin(Transaction, Transaction.id == transaction_id)
    if account:
        matched_entries = matched_entries.join(TransactionTypeMaster, Transaction.transaction_type_id == TransactionTypeMaster.id).filter(
            func.lower(TransactionTypeMaster.ledger_account) == account.account_name.lower()
        )
        entries = matched_entries

    prior = entries.filter(CashScrollBookEntry.date < start_date)
    balance = ZERO
    if starting_balance and starting_balance.balance_date <= start_date:
        balance = starting_balance.amount
        prior = prior.filter(CashScrollBookEntry.date >= starting_balance.balance_date)
    balance += prior.with_entities(
        func.coalesce(func.sum(CashScrollBookEntry.received_amount - CashScrollBookEntry.paid_amount), ZERO)
    ).scalar()

    by_date = defaultdict(list)
    for entry, transaction in matched_entries.add_entity(Transaction).filter(CashScrollBookEntry.date.between(start_date, end_date)).order_by(
        CashScrollBookEntry.date, CashScrollBookEntry.id
    ):
        source_reference = None
        details = None
        if transaction:
            source_reference = transaction.bill_no if transaction.entry_nature == "CREDIT" else transaction.voucher_no
            details = (transaction.particulars or "").strip()
            if transaction.cash_memo_no.startswith("BGS-") and FORM_ITEM_AMOUNT.search(details):
                details = FORM_TAX_NOTE.split(details, maxsplit=1)[0]
                details = FORM_ITEM_AMOUNT.sub("", details).replace(" | ", "\n").strip()
        serial = SERIAL.fullmatch((source_reference or "").strip()) or SERIAL.fullmatch((entry.voucher_no or "").strip())
        row = CashScrollRegisterEntry.model_validate(entry)
        row.reference_no = serial[1].zfill(4) if serial else None
        row.item_details = details or None
        by_date[entry.date].append(row)

    dates = set(by_date) | {start_date, end_date}
    if starting_balance and start_date <= starting_balance.balance_date <= end_date:
        dates.add(starting_balance.balance_date)
    days = []
    for day in sorted(dates):
        if starting_balance and day == starting_balance.balance_date:
            balance = starting_balance.amount
        rows = by_date[day]
        received = sum((row.received_amount for row in rows), ZERO)
        paid = sum((row.paid_amount for row in rows), ZERO)
        closing = balance + received - paid
        days.append(CashScrollDay(date=day, opening=balance, received=received, paid=paid, closing=closing, entries=rows))
        balance = closing
    return CashScrollRegister(starting_balance=starting_balance, days=days)


@router.put("/cash-scroll-opening-balance", dependencies=[Depends(require_transaction_user)])
def save_opening_balance(payload: CashScrollOpeningBalanceInput, account_id: int | None = None, db: Session = Depends(get_db)):
    account = get_account(db, account_id)
    values = payload.model_dump()
    insert = sqlite_insert if db.get_bind().dialect.name == "sqlite" else postgres_insert
    statement = insert(CashScrollOpeningBalance).values(scope=f"account:{account.id}" if account else "cash", **values)
    db.execute(statement.on_conflict_do_update(index_elements=[CashScrollOpeningBalance.scope], set_=values))
    db.commit()
    return payload
