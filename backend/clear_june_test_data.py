"""
Script 2: Delete all June 2026 test transaction records from the database safely.
Run via CLI: python clear_june_test_data.py
"""
import os
import sys
from datetime import date

# Ensure backend root in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Transaction

def clear_june_data():
    db = SessionLocal()
    try:
        sd = date(2026, 6, 1)
        ed = date(2026, 6, 30)

        june_txns = db.query(Transaction).filter(
            Transaction.date >= sd,
            Transaction.date <= ed
        ).all()

        count = len(june_txns)
        for t in june_txns:
            db.delete(t)

        db.commit()
        print(f"🗑️ Successfully deleted {count} June 2026 test transaction records from database.")
        return {"deleted": count}
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to clear June test data: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    clear_june_data()
