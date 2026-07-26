"""
Script 1: Seed realistic June 2026 test transactions covering all 16 transaction types (Credit & Debit).
Run via CLI: python seed_june_test_data.py
"""
import os
import sys
from datetime import date
from decimal import Decimal

# Ensure backend root in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models import Transaction, TransactionTypeMaster, Customer
from seed import seed as seed_masters

Base.metadata.create_all(bind=engine)

JUNE_TEST_TRANSACTIONS = [
    {
        "date": date(2026, 6, 1),
        "cash_memo_no": "BGS-20260601-0001",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Share Capital Allotment: 50 Shares @ Rs.100",
        "type_name": "Shares",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("5000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "New member share entry",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 2),
        "cash_memo_no": "BGS-20260602-0002",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "Organic Fertilizer Purchase: 25 bags — CGST: Rs.312.50, SGST: Rs.312.50",
        "type_name": "Purchases",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("12500.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Bulk fertilizer stock",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 4),
        "cash_memo_no": "BGS-20260604-0003",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "Produce Sales Agency Commission (5%)",
        "type_name": "Commission",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("3600.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Society commission",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 5),
        "cash_memo_no": "BGS-20260605-0004",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Agricultural Crop Loan Disbursement #402",
        "type_name": "Loan Account",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("25000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Approved crop loan",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 7),
        "cash_memo_no": "BGS-20260607-0005",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Monthly Crop Loan Interest Collection",
        "type_name": "Interest",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("1250.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Loan interest payment",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 9),
        "cash_memo_no": "BGS-20260609-0006",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Collector Pigmi Payout Commission (2%)",
        "type_name": "Pigmi Commission",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("2100.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Pigmi agent payout",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 11),
        "cash_memo_no": "BGS-20260611-0007",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Apex Bank Current Account Deposit",
        "type_name": "Bank Current",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("15000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Bank current transfer",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 13),
        "cash_memo_no": "BGS-20260613-0008",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Pre-harvest Produce Procurement Advance",
        "type_name": "Advance",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("4500.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Member advance",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 15),
        "cash_memo_no": "BGS-20260615-0009",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Daily Pigmi Deposit Installment Collection",
        "type_name": "Lakshmi Pigmi Deposit",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("1000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Pigmi deposit",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 17),
        "cash_memo_no": "BGS-20260617-0010",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "APMC Mandee Vegetable Agency Commission",
        "type_name": "Vegetable Commission",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("4800.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Daily mandee commission",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 19),
        "cash_memo_no": "BGS-20260619-0011",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Sundry Equipment Rental Receipts",
        "type_name": "Sundry Account",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("3500.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Equipment usage charges",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 20),
        "cash_memo_no": "BGS-20260620-0012",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "Sundry Facility Repair & Maintenance Payment",
        "type_name": "Sundry Account",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("2200.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Store repair cost",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 21),
        "cash_memo_no": "BGS-20260621-0013",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Hybrid Vegetable Seeds Retail Sale",
        "type_name": "Cash Sales",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("18200.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Counter cash sale",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 23),
        "cash_memo_no": "BGS-20260623-0014",
        "customer_id": "1000000001",
        "mobile_no": "9845012345",
        "customer_name": "Mr. Ramesh Kumar Patil",
        "particulars": "Monsoon Pesticide & Fungicide Spray Supply: 12 bottles",
        "type_name": "Pesticide Sales",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("8400.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Retail pesticides sale",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 25),
        "cash_memo_no": "BGS-20260625-0015",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Seasonal Cold Storage Unit Space Booking Advance",
        "type_name": "Cold Storage Advance",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("9000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Cold storage booking",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 27),
        "cash_memo_no": "BGS-20260627-0016",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "Short-Term Pigmi Member Loan Disbursement",
        "type_name": "Lakshmi Pigmi Deposit Loan",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("10000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Pigmi member loan",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 29),
        "cash_memo_no": "BGS-20260629-0017",
        "customer_id": "1000000002",
        "mobile_no": "9448198765",
        "customer_name": "Smt. Sunita R Kulkarni",
        "particulars": "Annual Pigmi Member Interest Payout Credited",
        "type_name": "Lakshmi Pigmi Deposit Interest",
        "entry_nature": "DEBIT",
        "amount_rs": Decimal("750.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Pigmi deposit interest payout",
        "created_by": "Accountant",
        "status": "POSTED",
    },
    {
        "date": date(2026, 6, 30),
        "cash_memo_no": "BGS-20260630-0018",
        "customer_id": "1000000003",
        "mobile_no": "9880054321",
        "customer_name": "Sri. Anand B Joshi",
        "particulars": "Additional Class A Share Subscription (100 Shares)",
        "type_name": "Shares",
        "entry_nature": "CREDIT",
        "amount_rs": Decimal("10000.00"),
        "amount_ps": Decimal("0.00"),
        "remarks": "Class A share subscription",
        "created_by": "Accountant",
        "status": "POSTED",
    },
]


def seed_june_data():
    seed_masters()
    db = SessionLocal()
    try:
        types_map = {t.name: t.id for t in db.query(TransactionTypeMaster).all()}
        inserted_count = 0
        skipped_count = 0

        for item in JUNE_TEST_TRANSACTIONS:
            memo = item["cash_memo_no"]
            existing = db.query(Transaction).filter(Transaction.cash_memo_no == memo).first()
            if existing:
                skipped_count += 1
                continue

            t_type_id = types_map.get(item["type_name"])
            if not t_type_id:
                print(f"⚠️ Warning: Transaction type '{item['type_name']}' not found in DB.")
                continue

            txn = Transaction(
                date=item["date"],
                cash_memo_no=item["cash_memo_no"],
                customer_id=item["customer_id"],
                mobile_no=item["mobile_no"],
                customer_name=item["customer_name"],
                particulars=item["particulars"],
                transaction_type_id=t_type_id,
                entry_nature=item["entry_nature"],
                amount_rs=item["amount_rs"],
                amount_ps=item["amount_ps"],
                remarks=item["remarks"],
                created_by=item["created_by"],
                status=item["status"],
            )
            db.add(txn)
            inserted_count += 1

        db.commit()
        print(f"✅ June Test Data Seeding Complete! Inserted: {inserted_count}, Skipped (already exist): {skipped_count}")
        return {"inserted": inserted_count, "skipped": skipped_count}
    except Exception as e:
        db.rollback()
        print(f"❌ June Test Data Seeding Failed: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_june_data()
