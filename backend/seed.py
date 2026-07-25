"""
Seed the database with default office master and all 16 transaction types.
Run once: python seed.py
"""
from database import SessionLocal, engine, Base
from models import OfficeMaster, TransactionTypeMaster, AccountMaster
import sys

Base.metadata.create_all(bind=engine)

TRANSACTION_TYPES = [
    {"name": "Shares",                        "cash_book_column": "Shares",                        "ledger_account": "Shares",                        "display_order": 1},
    {"name": "Purchases",                     "cash_book_column": "Purchases",                     "ledger_account": "Purchases",                     "display_order": 2},
    {"name": "Commission",                    "cash_book_column": "Commissions",                   "ledger_account": "Commission",                    "display_order": 3},
    {"name": "Loan Account",                  "cash_book_column": "Loan a/c",                      "ledger_account": "Loan a/c",                      "display_order": 4},
    {"name": "Interest",                      "cash_book_column": "Interest",                      "ledger_account": "Interest",                      "display_order": 5},
    {"name": "Pigmi Commission",              "cash_book_column": "Pigmi Comm.",                   "ledger_account": "Pigmi Comm.",                   "display_order": 6},
    {"name": "Bank Current",                  "cash_book_column": "Bank Current",                  "ledger_account": "Bank Current",                  "display_order": 7},
    {"name": "Advance",                       "cash_book_column": "Advance",                       "ledger_account": "Advance",                       "display_order": 8},
    {"name": "Lakshmi Pigmi Deposit",         "cash_book_column": "Lakshmi Pigmi Deposit",         "ledger_account": "Lakshmi Pigmi Deposit",         "display_order": 9},
    {"name": "Vegetable Commission",          "cash_book_column": "Vegetable Comm.",               "ledger_account": "Vegetable Comm.",               "display_order": 10},
    {"name": "Sundry Account",                "cash_book_column": "Sundary a/c",                   "ledger_account": "Sundary a/c",                   "display_order": 11},
    {"name": "Cash Sales",                    "cash_book_column": "Cash Sales",                    "ledger_account": "Cash Sales",                    "display_order": 12},
    {"name": "Pesticide Sales",               "cash_book_column": "Pesticide Sales",               "ledger_account": "Pesticide Sales",               "display_order": 13},
    {"name": "Cold Storage Advance",          "cash_book_column": "Cold Storage Adv",              "ledger_account": "Cold Storage Adv",              "display_order": 14},
    {"name": "Lakshmi Pigmi Deposit Loan",    "cash_book_column": "Lakshmi Pigmi Deposit Loan",    "ledger_account": "Lakshmi Pigmi Deposit Loan",    "display_order": 15},
    {"name": "Lakshmi Pigmi Deposit Interest","cash_book_column": "Lakshmi Pigmi Deposit Interest","ledger_account": "Lakshmi Pigmi Deposit Interest","display_order": 16},
]

OFFICE = {
    "gst_no": "29AAATB1234C1Z5",
    "phone1": "0831-2401234",
    "phone2": "0831-2401235",
    "office_name": "Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.",
    "address": "Belagavi, Karnataka - 590001",
}


def seed():
    db = SessionLocal()
    try:
        # Office
        if not db.query(OfficeMaster).first():
            db.add(OfficeMaster(**OFFICE))
            print("✓ Office master seeded")
        else:
            print("- Office master already exists, skipping")

        # Transaction Types
        existing_names = {t.name for t in db.query(TransactionTypeMaster).all()}
        for tt in TRANSACTION_TYPES:
            if tt["name"] not in existing_names:
                db.add(TransactionTypeMaster(**tt))
                print(f"  ✓ Added: {tt['name']}")
            else:
                print(f"  - Exists: {tt['name']}")

        # Account Master (mirrors transaction type ledger_account values)
        existing_accs = {a.account_name for a in db.query(AccountMaster).all()}
        unique_accounts = {tt["ledger_account"] for tt in TRANSACTION_TYPES}
        for acc in sorted(unique_accounts):
            if acc not in existing_accs:
                db.add(AccountMaster(account_name=acc))

        # Users (Accountant & Cashier)
        from models import User
        default_users = [
            {"username": "accountant", "password": "pass123", "full_name": "Accounts Officer", "role": "ACCOUNTS"},
            {"username": "cashier", "password": "pass123", "full_name": "Society Cashier", "role": "CASHIER"},
        ]
        existing_usernames = {u.username for u in db.query(User).all()}
        for u in default_users:
            if u["username"] not in existing_usernames:
                db.add(User(**u))
                print(f"  ✓ Added user: {u['username']} ({u['role']})")

        db.commit()
        print("\n✅ Seed complete!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
