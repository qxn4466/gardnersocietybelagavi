#!/usr/bin/env python3
"""
One-time production data wipe — FRESH START (keeps login credentials & masters).

KEEPS : users, office_master, transaction_type_master, account_master,
        pesticide_product_master, system_balance_settings
WIPES : transactions, customers, cash_payment_vouchers, cash_receipt_vouchers,
        rent_bills, cash_scroll_book, cheque_issue_book, shop_selling_rate_book,
        shop_tax_invoices, shop_retail_bills, pesticide_sale_register,
        meeting_notices, yearly_audit_reports, translation_cache

Run from the backend directory (the folder that contains database.py), using the
same Python environment the backend service runs with:

    cd ~/gardnersocietybelagavi/backend
    python3 wipe_data_keep_credentials.py

It reads DATABASE_URL from backend/.env automatically (SQLite or PostgreSQL).
You must type WIPE to confirm. A backup is strongly advised (see header notes
printed by the script).
"""
import sys

from database import SessionLocal, engine
from models import (
    User, OfficeMaster, TransactionTypeMaster, AccountMaster, Customer,
    Transaction, CashPaymentVoucher, CashReceiptVoucher, RentBill,
    CashScrollBookEntry, ChequeIssueBookEntry, SystemBalanceSetting,
    ShopSellingRateEntry, ShopTaxInvoice, ShopRetailBill, PesticideSaleEntry,
    PesticideProductMaster, MeetingNotice, YearlyAuditReport, TranslationCache,
)

# (Model, table name) pairs to DELETE from — everything except credentials & masters
WIPE_TABLES = [
    (Transaction, "transactions"),
    (Customer, "customers"),
    (CashPaymentVoucher, "cash_payment_vouchers"),
    (CashReceiptVoucher, "cash_receipt_vouchers"),
    (RentBill, "rent_bills"),
    (CashScrollBookEntry, "cash_scroll_book"),
    (ChequeIssueBookEntry, "cheque_issue_book"),
    (ShopSellingRateEntry, "shop_selling_rate_book"),
    (ShopTaxInvoice, "shop_tax_invoices"),
    (ShopRetailBill, "shop_retail_bills"),
    (PesticideSaleEntry, "pesticide_sale_register"),
    (MeetingNotice, "meeting_notices"),
    (YearlyAuditReport, "yearly_audit_reports"),
    (TranslationCache, "translation_cache"),
]

KEPT_TABLES = [
    "users (login accounts)",
    "office_master (society profile)",
    "transaction_type_master (account heads)",
    "account_master",
    "pesticide_product_master (product list)",
    "system_balance_settings (opening balance)",
]


def row_count(db, model) -> int:
    return db.query(model).count()


def reset_postgres_sequences(db) -> None:
    """After DELETE, restart id sequences at 1 for the wiped tables (PostgreSQL only)."""
    if not engine.url.get_backend_name().startswith("postgresql"):
        return
    from sqlalchemy import text
    for _, table in WIPE_TABLES:
        try:
            db.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), 1, false)"
            ))
        except Exception as exc:  # table without an id sequence, etc.
            print(f"  [seq] skipped {table}: {exc}")


def main() -> int:
    is_postgres = engine.url.get_backend_name().startswith("postgresql")
    print("=" * 68)
    print("PRODUCTION DATA WIPE — fresh start")
    print("=" * 68)
    print(f"Database engine : {engine.url.get_backend_name()}")
    print(f"Database target : {engine.url.database}")
    print("\nWILL KEEP:")
    for t in KEPT_TABLES:
        print(f"  KEEP  {t}")
    print("\nWILL DELETE ALL ROWS FROM:")
    for _, t in WIPE_TABLES:
        print(f"  WIPE  {t}")

    print("\nBACKUP FIRST — depending on the engine:")
    if is_postgres:
        print("  pg_dump -Fc \"$DATABASE_URL\" -f backup_$(date +%F).dump")
    else:
        print("  cp gardner_society.db backup_$(date +%F).db")

    db = SessionLocal()
    try:
        print("\nRow counts right now:")
        planned: list[tuple[str, int]] = []
        for model, table in WIPE_TABLES:
            n = row_count(db, model)
            planned.append((table, n))
            print(f"  {table:28s} {n:>7d} row(s)")

        total = sum(n for _, n in planned)
        if total == 0:
            print("\nNothing to delete — all target tables are already empty.")
            return 0

        answer = input(f"\nType WIPE to permanently delete {total} row(s): ").strip()
        if answer != "WIPE":
            print("Aborted — nothing was deleted.")
            return 1

        for model, table in WIPE_TABLES:
            deleted = db.query(model).delete(synchronize_session=False)
            print(f"  deleted {deleted:>7d} row(s) from {table}")

        reset_postgres_sequences(db)
        db.commit()
        print("\nDone. Remaining row counts:")
        for model, table in WIPE_TABLES:
            print(f"  {table:28s} {row_count(db, model):>7d} row(s)")
        users = db.query(User).count()
        print(f"  {'users (credentials)':28s} {users:>7d} row(s)  <-- untouched")
        print("\nRestart the backend service so any cached state refreshes:")
        print("  sudo systemctl restart gardner-backend.service")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"\nERROR — rolled back, nothing partial was committed: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
