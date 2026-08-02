"""
Seed the database with default office master and all 16 transaction types.
Run once: python seed.py
"""
from database import SessionLocal, engine, Base
from models import OfficeMaster, TransactionTypeMaster, AccountMaster
import sys

Base.metadata.create_all(bind=engine)

TRANSACTION_TYPES = [
    {"name": "Shares",                        "cash_book_column": "Shares",                        "ledger_account": "Shares",                        "display_order": 1,  "entry_type": "CREDIT"},
    {"name": "Purchases",                     "cash_book_column": "Purchases",                     "ledger_account": "Purchases",                     "display_order": 2,  "entry_type": "DEBIT"},
    {"name": "Commission",                    "cash_book_column": "Commissions",                   "ledger_account": "Commission",                    "display_order": 3,  "entry_type": "CREDIT"},
    {"name": "Loan Account",                  "cash_book_column": "Loan a/c",                      "ledger_account": "Loan a/c",                      "display_order": 4,  "entry_type": "DEBIT"},
    {"name": "Interest",                      "cash_book_column": "Interest",                      "ledger_account": "Interest",                      "display_order": 5,  "entry_type": "CREDIT"},
    {"name": "Pigmi Commission",              "cash_book_column": "Pigmi Comm.",                   "ledger_account": "Pigmi Comm.",                   "display_order": 6,  "entry_type": "CREDIT"},
    {"name": "Bank Current",                  "cash_book_column": "Bank Current",                  "ledger_account": "Bank Current",                  "display_order": 7,  "entry_type": "DEBIT"},
    {"name": "Advance",                       "cash_book_column": "Advance",                       "ledger_account": "Advance",                       "display_order": 8,  "entry_type": "DEBIT"},
    {"name": "Lakshmi Pigmi Deposit",         "cash_book_column": "Lakshmi Pigmi Deposit",         "ledger_account": "Lakshmi Pigmi Deposit",         "display_order": 9,  "entry_type": "CREDIT"},
    {"name": "Vegetable Commission",          "cash_book_column": "Vegetable Comm.",               "ledger_account": "Vegetable Comm.",               "display_order": 10, "entry_type": "CREDIT"},
    {"name": "Sundry Account",                "cash_book_column": "Sundary a/c",                   "ledger_account": "Sundary a/c",                   "display_order": 11, "entry_type": "BOTH"},
    {"name": "Cash Sales",                    "cash_book_column": "Cash Sales",                    "ledger_account": "Cash Sales",                    "display_order": 12, "entry_type": "CREDIT"},
    {"name": "Pesticide Sales",               "cash_book_column": "Pesticide Sales",               "ledger_account": "Pesticide Sales",               "display_order": 13, "entry_type": "CREDIT"},
    {"name": "Cold Storage Advance",          "cash_book_column": "Cold Storage Adv",              "ledger_account": "Cold Storage Adv",              "display_order": 14, "entry_type": "DEBIT"},
    {"name": "Lakshmi Pigmi Deposit Loan",    "cash_book_column": "Lakshmi Pigmi Deposit Loan",    "ledger_account": "Lakshmi Pigmi Deposit Loan",    "display_order": 15, "entry_type": "DEBIT"},
    {"name": "Lakshmi Pigmi Deposit Interest","cash_book_column": "Lakshmi Pigmi Deposit Interest","ledger_account": "Lakshmi Pigmi Deposit Interest","display_order": 16, "entry_type": "DEBIT"},
]

OFFICE = {
    "gst_no": "29AAAAB1234C1Z5",
    "phone1": "0831-2400123",
    "phone2": "0831-2400124",
    "office_name": "Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.",
    "address": "930/1A Zanda Chowk Market, Belgaum 590002",
}


def seed():
    db = SessionLocal()
    try:
        # Office
        if not db.query(OfficeMaster).first():
            db.add(OfficeMaster(**OFFICE))
            print("✓ Office master seeded")
        
        # Transaction Types
        for tt in TRANSACTION_TYPES:
            existing = db.query(TransactionTypeMaster).filter_by(name=tt["name"]).first()
            if not existing:
                db.add(TransactionTypeMaster(**tt))
            else:
                existing.cash_book_column = tt["cash_book_column"]
                existing.ledger_account = tt["ledger_account"]
                existing.display_order = tt["display_order"]
                existing.entry_type = tt["entry_type"]
        
        # Account Master (mirrors transaction type ledger_account values)
        unique_accounts = {tt["ledger_account"] for tt in TRANSACTION_TYPES}
        for acc_name in unique_accounts:
            existing = db.query(AccountMaster).filter_by(account_name=acc_name).first()
            if not existing:
                db.add(AccountMaster(account_name=acc_name))

        # Users (Accountant & Cashier)
        from models import User, Customer
        default_users = [
            {"username": "accountant", "password": "pass123", "full_name": "Accounts Officer", "role": "ACCOUNTS"},
            {"username": "cashier", "password": "pass123", "full_name": "Society Cashier", "role": "CASHIER"},
        ]
        existing_usernames = {u.username for u in db.query(User).all()}
        for u in default_users:
            if u["username"] not in existing_usernames:
                db.add(User(**u))
                print(f"  ✓ Added user: {u['username']} ({u['role']})")

        # Initial Sample Customers
        if db.query(Customer).count() == 0:
            default_customers = [
                {
                    "customer_id": "1000000001",
                    "salutation": "Mr.",
                    "first_name": "Ramesh",
                    "middle_name": "Kumar",
                    "last_name": "Patil",
                    "full_name": "Mr. Ramesh Kumar Patil",
                    "mobile_no": "9845012345",
                    "address": "Plot 42, Shahapur, Belgaum, Karnataka - 590003",
                    "aadhaar_no": "458912349012",
                    "pan_no": "ABCDE1234F",
                    "opening_balance": 5000.00,
                    "status": "ACTIVE",
                },
                {
                    "customer_id": "1000000002",
                    "salutation": "Smt.",
                    "first_name": "Sunita",
                    "middle_name": "R",
                    "last_name": "Kulkarni",
                    "full_name": "Smt. Sunita R Kulkarni",
                    "mobile_no": "9448198765",
                    "address": "12/B Tilakwadi 3rd Line, Belgaum, Karnataka - 590006",
                    "aadhaar_no": "890123456789",
                    "pan_no": "XYZPK9876Q",
                    "opening_balance": 10000.00,
                    "status": "ACTIVE",
                },
                {
                    "customer_id": "1000000003",
                    "salutation": "Sri.",
                    "first_name": "Anand",
                    "middle_name": "B",
                    "last_name": "Joshi",
                    "full_name": "Sri. Anand B Joshi",
                    "mobile_no": "9880054321",
                    "address": "Main Street, Vadgaon, Belgaum, Karnataka - 590005",
                    "aadhaar_no": "234567890123",
                    "pan_no": "JOSHI5432M",
                    "opening_balance": 2500.00,
                    "status": "ACTIVE",
                },
            ]
            for cust in default_customers:
                db.add(Customer(**cust))

        db.commit()
        print("\n✅ Seed complete!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
