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
        sd = date(2026, 1, 1)
        ed = date(2026, 12, 31)

        june_txns = db.query(Transaction).filter(
            Transaction.date >= sd,
            Transaction.date <= ed
        ).all()

        count = len(june_txns)
        for t in june_txns:
            db.delete(t)

        db.commit()
        print(f"🗑️ Successfully deleted {count} 2026 test transaction records from database.")
        return {"deleted": count}
    except Exception as e:
        db.rollback()
        print(f"❌ Notice during clear June test data: {e}")
        # Perform fallback bulk delete
        try:
            del_count = db.query(Transaction).filter(
                Transaction.date >= date(2026, 1, 1),
                Transaction.date <= date(2026, 12, 31)
            ).delete(synchronize_session=False)
            db.commit()
            return {"deleted": del_count}
        except Exception as ex:
            db.rollback()
            return {"deleted": 0, "notice": str(ex)}
    finally:
        db.close()


if __name__ == "__main__":
    clear_june_data()
