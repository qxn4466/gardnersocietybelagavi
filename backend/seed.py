"""
Seed the database with default office master and all 16 transaction types.
Run once: python seed.py
"""
from database import SessionLocal, engine, Base
from models import OfficeMaster, TransactionTypeMaster, AccountMaster
import sys

Base.metadata.create_all(bind=engine)

TRANSACTION_TYPES = [
    # ── Credit Items ──
    {"name": "Pooja Expenses", "cash_book_column": "Sundary a/c", "ledger_account": "Pooja Expenses", "display_order": 1, "entry_type": "CREDIT"},
    {"name": "Sou Lakshmi Pigmy Deposit Loan", "cash_book_column": "Lakshmi Pigmi Deposit Loan", "ledger_account": "Sou Lakshmi Pigmy Deposit Loan", "display_order": 2, "entry_type": "BOTH"},
    {"name": "Sundrey A/C", "cash_book_column": "Sundary a/c", "ledger_account": "Sundrey A/C", "display_order": 3, "entry_type": "BOTH"},
    {"name": "Rikshaw charges", "cash_book_column": "Sundary a/c", "ledger_account": "Rikshaw charges", "display_order": 4, "entry_type": "CREDIT"},
    {"name": "PF A/C", "cash_book_column": "Sundary a/c", "ledger_account": "PF A/C", "display_order": 5, "entry_type": "BOTH"},
    {"name": "Mobile Recharge", "cash_book_column": "Sundary a/c", "ledger_account": "Mobile Recharge", "display_order": 6, "entry_type": "CREDIT"},
    {"name": "The Pioneer Urban Bank CC", "cash_book_column": "Bank Current", "ledger_account": "The Pioneer Urban Bank CC", "display_order": 7, "entry_type": "BOTH"},
    {"name": "ESI A/C", "cash_book_column": "Sundary a/c", "ledger_account": "ESI A/C", "display_order": 8, "entry_type": "BOTH"},
    {"name": "Administrative charges", "cash_book_column": "Sundary a/c", "ledger_account": "Administrative charges", "display_order": 9, "entry_type": "CREDIT"},
    {"name": "Sou Lakshmi Pigmy Deposit", "cash_book_column": "Lakshmi Pigmi Deposit", "ledger_account": "Sou Lakshmi Pigmy Deposit", "display_order": 10, "entry_type": "BOTH"},
    {"name": "Insurance Fund", "cash_book_column": "Sundary a/c", "ledger_account": "Insurance Fund", "display_order": 11, "entry_type": "CREDIT"},
    {"name": "FD A/C", "cash_book_column": "Sundary a/c", "ledger_account": "FD A/C", "display_order": 12, "entry_type": "BOTH"},
    {"name": "FD Interest", "cash_book_column": "Interest", "ledger_account": "FD Interest", "display_order": 13, "entry_type": "CREDIT"},
    {"name": "Daily Wages", "cash_book_column": "Sundary a/c", "ledger_account": "Daily Wages", "display_order": 14, "entry_type": "CREDIT"},
    {"name": "Electric Power A/C", "cash_book_column": "Sundary a/c", "ledger_account": "Electric Power A/C", "display_order": 15, "entry_type": "BOTH"},
    {"name": "Advance A/C", "cash_book_column": "Advance", "ledger_account": "Advance A/C", "display_order": 16, "entry_type": "BOTH"},
    {"name": "The Pioneer Urban Bank CA", "cash_book_column": "Bank Current", "ledger_account": "The Pioneer Urban Bank CA", "display_order": 17, "entry_type": "BOTH"},
    {"name": "Printing And Stationary", "cash_book_column": "Sundary a/c", "ledger_account": "Printing And Stationary", "display_order": 18, "entry_type": "CREDIT"},
    {"name": "Seed Section Plastic Bag", "cash_book_column": "Sundary a/c", "ledger_account": "Seed Section Plastic Bag", "display_order": 19, "entry_type": "CREDIT"},
    {"name": "Contigency A/C", "cash_book_column": "Sundary a/c", "ledger_account": "Contigency A/C", "display_order": 20, "entry_type": "CREDIT"},
    {"name": "GST Feeding fee", "cash_book_column": "Sundary a/c", "ledger_account": "GST Feeding fee", "display_order": 25, "entry_type": "CREDIT"},
    {"name": "Pesticide purchases", "cash_book_column": "Purchases", "ledger_account": "Pesticide purchases", "display_order": 26, "entry_type": "CREDIT"},
    {"name": "Meeting allowance", "cash_book_column": "Sundary a/c", "ledger_account": "Meeting allowance", "display_order": 27, "entry_type": "CREDIT"},
    {"name": "Legal Fee", "cash_book_column": "Sundary a/c", "ledger_account": "Legal Fee", "display_order": 28, "entry_type": "CREDIT"},
    {"name": "Sou Lakshmi Pigmy Deposit Interest", "cash_book_column": "Lakshmi Pigmi Deposit Interest", "ledger_account": "Sou Lakshmi Pigmy Deposit Interest", "display_order": 29, "entry_type": "BOTH"},
    {"name": "Seed purchase", "cash_book_column": "Purchases", "ledger_account": "Seed purchase", "display_order": 30, "entry_type": "CREDIT"},
    {"name": "PF and other contribution", "cash_book_column": "Sundary a/c", "ledger_account": "PF and other contribution", "display_order": 31, "entry_type": "CREDIT"},
    {"name": "ESI and other contribution", "cash_book_column": "Sundary a/c", "ledger_account": "ESI and other contribution", "display_order": 32, "entry_type": "CREDIT"},
    {"name": "PAY A/C", "cash_book_column": "Sundary a/c", "ledger_account": "PAY A/C", "display_order": 33, "entry_type": "CREDIT"},
    {"name": "Union Bank of India", "cash_book_column": "Bank Current", "ledger_account": "Union Bank of India", "display_order": 34, "entry_type": "BOTH"},
    {"name": "TDS A/C", "cash_book_column": "Sundary a/c", "ledger_account": "TDS A/C", "display_order": 35, "entry_type": "CREDIT"},
    {"name": "Sou Lakshmi Pigmy Deposit commission", "cash_book_column": "Pigmi Comm.", "ledger_account": "Sou Lakshmi Pigmy Deposit commission", "display_order": 36, "entry_type": "BOTH"},

    # ── Debit Items ──
    {"name": "Sou Lakshmi Pigmy Deposit", "cash_book_column": "Lakshmi Pigmi Deposit", "ledger_account": "Sou Lakshmi Pigmy Deposit", "display_order": 37, "entry_type": "BOTH"},
    {"name": "Pesticide sales", "cash_book_column": "Pesticide Sales", "ledger_account": "Pesticide sales", "display_order": 38, "entry_type": "DEBIT"},
    {"name": "Union Bank of India", "cash_book_column": "Bank Current", "ledger_account": "Union Bank of India", "display_order": 43, "entry_type": "BOTH"},
    {"name": "The Pioneer Urban Bank CC", "cash_book_column": "Bank Current", "ledger_account": "The Pioneer Urban Bank CC", "display_order": 44, "entry_type": "BOTH"},
    {"name": "FD A/C", "cash_book_column": "Sundary a/c", "ledger_account": "FD A/C", "display_order": 45, "entry_type": "BOTH"},
    {"name": "Cold Stove Godawan", "cash_book_column": "Cold Storage Adv", "ledger_account": "Cold Stove Godawan", "display_order": 46, "entry_type": "DEBIT"},
    {"name": "Head Office Building rent", "cash_book_column": "Sundary a/c", "ledger_account": "Head Office Building rent", "display_order": 47, "entry_type": "DEBIT"},
    {"name": "Onion Market Godawan", "cash_book_column": "Sundary a/c", "ledger_account": "Onion Market Godawan", "display_order": 48, "entry_type": "DEBIT"},
    {"name": "Under Godawan Rent", "cash_book_column": "Sundary a/c", "ledger_account": "Under Godawan Rent", "display_order": 49, "entry_type": "DEBIT"},
    {"name": "The Pioneer Urban Bank CA", "cash_book_column": "Bank Current", "ledger_account": "The Pioneer Urban Bank CA", "display_order": 50, "entry_type": "BOTH"},
    {"name": "Sou Lakshmi Pigmy Deposit commission", "cash_book_column": "Pigmi Comm.", "ledger_account": "Sou Lakshmi Pigmy Deposit commission", "display_order": 51, "entry_type": "BOTH"},
    {"name": "Sou Lakshmi Pigmy Deposit Loan", "cash_book_column": "Lakshmi Pigmi Deposit Loan", "ledger_account": "Sou Lakshmi Pigmy Deposit Loan", "display_order": 52, "entry_type": "BOTH"},
    {"name": "Sou Lakshmi Pigmy Deposit Interest", "cash_book_column": "Lakshmi Pigmi Deposit Interest", "ledger_account": "Sou Lakshmi Pigmy Deposit Interest", "display_order": 53, "entry_type": "BOTH"},
    {"name": "Electric Power A/C", "cash_book_column": "Sundary a/c", "ledger_account": "Electric Power A/C", "display_order": 54, "entry_type": "BOTH"},
    {"name": "Shares A/C", "cash_book_column": "Shares", "ledger_account": "Shares A/C", "display_order": 55, "entry_type": "BOTH"},
    {"name": "Sundrey A/C", "cash_book_column": "Sundary a/c", "ledger_account": "Sundrey A/C", "display_order": 56, "entry_type": "BOTH"},
    {"name": "Advance A/C", "cash_book_column": "Advance", "ledger_account": "Advance A/C", "display_order": 57, "entry_type": "BOTH"},
    {"name": "PF A/C", "cash_book_column": "Sundary a/c", "ledger_account": "PF A/C", "display_order": 58, "entry_type": "BOTH"},
    {"name": "ESI A/C", "cash_book_column": "Sundary a/c", "ledger_account": "ESI A/C", "display_order": 59, "entry_type": "BOTH"},
    {"name": "Vegetable Commission", "cash_book_column": "Vegetable Comm.", "ledger_account": "Vegetable Commission", "display_order": 60, "entry_type": "DEBIT"},

    # ── Core Items ──
    {"name": "Shares", "cash_book_column": "Shares", "ledger_account": "Shares", "display_order": 48, "entry_type": "CREDIT"},
    {"name": "Purchases", "cash_book_column": "Purchases", "ledger_account": "Purchases", "display_order": 49, "entry_type": "DEBIT"},
    {"name": "Commission", "cash_book_column": "Commissions", "ledger_account": "Commission", "display_order": 50, "entry_type": "CREDIT"},
    {"name": "Loan Account", "cash_book_column": "Loan a/c", "ledger_account": "Loan a/c", "display_order": 51, "entry_type": "DEBIT"},
    {"name": "Interest", "cash_book_column": "Interest", "ledger_account": "Interest", "display_order": 52, "entry_type": "CREDIT"},
    {"name": "Pigmi Commission", "cash_book_column": "Pigmi Comm.", "ledger_account": "Pigmi Commission", "display_order": 53, "entry_type": "CREDIT"},
    {"name": "Bank Current", "cash_book_column": "Bank Current", "ledger_account": "Bank Current", "display_order": 54, "entry_type": "DEBIT"},
    {"name": "Cash Sales", "cash_book_column": "Cash Sales", "ledger_account": "Cash Sales", "display_order": 55, "entry_type": "CREDIT"},
]

OFFICE = {
    "gst_no": "29AAAAB1234C1Z5",
    "phone1": "0831-2460534",
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
        
        # Clean up old tax entries from TransactionTypeMaster so they don't appear in dropdowns
        db.query(TransactionTypeMaster).filter(
            TransactionTypeMaster.name.in_([
                "CGST paid (9%)", "SGST paid (9%)", "CGST paid (2.5%)", "SGST paid (2.5%)",
                "CGST(9%)", "SGST(9%)", "CGST received (2.5%)", "SGST received (2.5%)"
            ])
        ).delete(synchronize_session=False)

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
