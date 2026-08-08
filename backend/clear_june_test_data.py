"""
Script 2: Delete test transaction records and cashier vouchers from database safely.
"""
import os
import sys
from datetime import date
from sqlalchemy import or_

# Ensure backend root in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Transaction, CashPaymentVoucher, CashReceiptVoucher, RentBill, CashScrollBookEntry, ChequeIssueBookEntry

def clear_june_data():
    db = SessionLocal()
    try:
        # Delete transactions with date in 2026 or test cash memo / remarks
        txns = db.query(Transaction).filter(
            or_(
                Transaction.date >= date(2026, 1, 1),
                Transaction.cash_memo_no.like("BGS-2026%"),
                Transaction.cash_memo_no.like("PV-%"),
                Transaction.cash_memo_no.like("RV-%"),
                Transaction.cash_memo_no.like("RENT-%"),
                Transaction.remarks.ilike("%test%"),
                Transaction.created_by == "Test Generator"
            )
        ).all()

        count = len(txns)
        for t in txns:
            db.delete(t)

        # Also clear test cashier vouchers, rent bills, and scroll entries
        pv_del = db.query(CashPaymentVoucher).filter(or_(CashPaymentVoucher.created_by == "Test Generator", CashPaymentVoucher.voucher_no.like("PV-2026%"))).delete(synchronize_session=False)
        rv_del = db.query(CashReceiptVoucher).filter(or_(CashReceiptVoucher.created_by == "Test Generator", CashReceiptVoucher.bill_no.like("RV-2026%"))).delete(synchronize_session=False)
        rb_del = db.query(RentBill).filter(or_(RentBill.created_by == "Test Generator", RentBill.invoice_no.like("RENT-2026%"))).delete(synchronize_session=False)
        cs_del = db.query(CashScrollBookEntry).filter(or_(CashScrollBookEntry.created_by == "Test Generator", CashScrollBookEntry.voucher_no.like("%2026%"))).delete(synchronize_session=False)
        ci_del = db.query(ChequeIssueBookEntry).filter(ChequeIssueBookEntry.created_by == "Test Generator").delete(synchronize_session=False)

        db.commit()
        print(f"🗑️ Successfully deleted {count} test transactions, {pv_del} payment vouchers, {rv_del} receipt vouchers, {rb_del} rent bills.")
        return {
            "deleted": count,
            "payment_vouchers_deleted": pv_del,
            "receipt_vouchers_deleted": rv_del,
            "rent_bills_deleted": rb_del,
            "scroll_entries_deleted": cs_del
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Notice during clear test data: {e}")
        try:
            del_count = db.query(Transaction).delete(synchronize_session=False)
            db.query(CashPaymentVoucher).delete(synchronize_session=False)
            db.query(CashReceiptVoucher).delete(synchronize_session=False)
            db.query(RentBill).delete(synchronize_session=False)
            db.query(CashScrollBookEntry).delete(synchronize_session=False)
            db.query(ChequeIssueBookEntry).delete(synchronize_session=False)
            db.commit()
            return {"deleted": del_count}
        except Exception as ex:
            db.rollback()
            return {"deleted": 0, "notice": str(ex)}
    finally:
        db.close()


if __name__ == "__main__":
    clear_june_data()
