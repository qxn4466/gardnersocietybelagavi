from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Text, Date, Numeric,
    ForeignKey, DateTime, func, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class OfficeMaster(Base):
    __tablename__ = "office_master"

    id = Column(Integer, primary_key=True, index=True)
    gst_no = Column(String(15), nullable=False)
    phone1 = Column(String(15), nullable=True)
    phone2 = Column(String(15), nullable=True)
    office_name = Column(Text, nullable=False)
    address = Column(Text, nullable=True)


class TransactionTypeMaster(Base):
    __tablename__ = "transaction_type_master"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    cash_book_column = Column(String(100), nullable=False)
    ledger_account = Column(String(100), nullable=False)
    entry_type = Column(String(10), nullable=False, default="CREDIT")  # "CREDIT", "DEBIT", "BOTH"
    display_order = Column(Integer, default=0)

    transactions = relationship("Transaction", back_populates="transaction_type")


class AccountMaster(Base):
    __tablename__ = "account_master"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(100), nullable=False, unique=True)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    cash_memo_no = Column(String(30), nullable=False, unique=True, index=True)
    customer_id = Column(String(50), nullable=True, index=True)
    mobile_no = Column(String(20), nullable=True, index=True)
    customer_name = Column(String(200), nullable=False)
    particulars = Column(Text, nullable=True)
    transaction_type_id = Column(Integer, ForeignKey("transaction_type_master.id"), nullable=False)
    entry_nature = Column(String(10), nullable=False, default="CREDIT")  # "CREDIT" or "DEBIT"
    amount_rs = Column(Numeric(12, 2), nullable=False, default=0)
    amount_ps = Column(Numeric(4, 2), nullable=False, default=0)
    remarks = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="POSTED")
    created_at = Column(DateTime, server_default=func.now())

    transaction_type = relationship("TransactionTypeMaster", back_populates="transactions")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    password = Column(String(100), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(30), nullable=False)  # "ACCOUNTS" or "CASHIER"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(10), nullable=False, unique=True, index=True)
    salutation = Column(String(20), default="Mr.")
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(300), nullable=False)
    mobile_no = Column(String(20), nullable=True, index=True)
    address = Column(Text, nullable=True)
    aadhaar_no = Column(String(20), nullable=True)
    aadhaar_doc_path = Column(Text, nullable=True)
    aadhaar_back_doc_path = Column(Text, nullable=True)
    pan_no = Column(String(20), nullable=True)
    pan_doc_path = Column(Text, nullable=True)
    opening_balance = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())


class TranslationCache(Base):
    """Cache for IndicTrans2 translations to avoid repeated microservice calls."""
    __tablename__ = "translation_cache"
    __table_args__ = (UniqueConstraint("source_text", "target_lang", name="uq_translation"),)

    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(Text, nullable=False, index=True)
    target_lang = Column(String(20), nullable=False, default="mar_Deva")
    translated_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ─── Cashier Models ─────────────────────────────────────────────────────────────

class CashPaymentVoucher(Base):
    """1. Cash Payment Voucher (Payment Voucher)"""
    __tablename__ = "cash_payment_vouchers"

    id = Column(Integer, primary_key=True, index=True)
    voucher_no = Column(String(50), nullable=False, unique=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    paid_to = Column(String(250), nullable=False)
    purpose_remarks = Column(Text, nullable=True)
    details_of_expenditure = Column(Text, nullable=True)
    amount_rs = Column(Numeric(12, 2), nullable=False, default=0)
    amount_words = Column(Text, nullable=True)
    receipt_doc_path = Column(Text, nullable=True)
    payment_mode = Column(String(20), nullable=False, default="CASH")
    cheque_no = Column(String(50), nullable=True)
    cheque_date = Column(Date, nullable=True)
    bank_name = Column(String(150), nullable=True)
    created_by = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="POSTED")
    created_at = Column(DateTime, server_default=func.now())


class CashReceiptVoucher(Base):
    """2. Cash Receipt Voucher (Receipt Voucher / Cash Memo)"""
    __tablename__ = "cash_receipt_vouchers"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String(50), nullable=False, unique=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    gst_no = Column(String(30), nullable=True)
    phone_no = Column(String(30), nullable=True)
    received_from = Column(String(250), nullable=False)
    particulars = Column(Text, nullable=True)
    loan_amount = Column(Numeric(12, 2), nullable=False, default=0)
    interest_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    receipt_doc_path = Column(Text, nullable=True)
    payment_mode = Column(String(20), nullable=False, default="CASH")
    cheque_no = Column(String(50), nullable=True)
    cheque_date = Column(Date, nullable=True)
    bank_name = Column(String(150), nullable=True)
    created_by = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="POSTED")
    created_at = Column(DateTime, server_default=func.now())


class RentBill(Base):
    """3. Rent Bill Form (Tax Invoice)"""
    __tablename__ = "rent_bills"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(50), nullable=False, unique=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    consignee_name = Column(String(250), nullable=False)
    consignee_address = Column(Text, nullable=True)
    particulars = Column(Text, nullable=True)
    hsn_sac = Column(String(50), nullable=True, default="997212")
    gst_rate = Column(Numeric(5, 2), nullable=False, default=18.0)
    qty = Column(Numeric(10, 2), nullable=False, default=1.0)
    rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    per = Column(String(20), nullable=True, default="Month")
    amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    igst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    sgst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    cgst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    tax_amount_words = Column(Text, nullable=True)
    payment_mode = Column(String(20), nullable=False, default="CASH")
    cheque_no = Column(String(50), nullable=True)
    cheque_date = Column(Date, nullable=True)
    bank_name = Column(String(150), nullable=True)
    created_by = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="POSTED")
    created_at = Column(DateTime, server_default=func.now())



class CashScrollBookEntry(Base):
    """4. Cash Scroll Book"""
    __tablename__ = "cash_scroll_book"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    page_no = Column(String(50), nullable=True)
    voucher_no = Column(String(50), nullable=True)
    from_received_paid = Column(String(250), nullable=False)
    received_amount = Column(Numeric(12, 2), nullable=False, default=0)
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0)
    cheque_amount = Column(Numeric(12, 2), nullable=False, default=0)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ChequeIssueBookEntry(Base):
    """5. Cheque Issue Book"""
    __tablename__ = "cheque_issue_book"

    id = Column(Integer, primary_key=True, index=True)
    issue_date = Column(Date, nullable=False, default=date.today)
    name_to_whom_issued = Column(String(250), nullable=False)
    cheque_no = Column(String(50), nullable=False, index=True)
    amount_rs = Column(Numeric(12, 2), nullable=False, default=0)
    remarks = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ─── SHOP KEEPER MODELS ──────────────────────────────────────────────────────

class ShopSellingRateEntry(Base):
    """1. Seeds, Pesticides, Spraypump and Other Selling Rate Book"""
    __tablename__ = "shop_selling_rate_book"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    name = Column(String(250), nullable=False)
    particulars = Column(String(250), nullable=False)
    qty = Column(Numeric(10, 2), nullable=False, default=1.0)
    amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    sgst = Column(Numeric(12, 2), nullable=False, default=0.0)
    cgst = Column(Numeric(12, 2), nullable=False, default=0.0)
    hmall = Column(Numeric(12, 2), nullable=False, default=0.0)
    motor_rent = Column(Numeric(12, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    net_rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    selling_rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    stock_book_no = Column(String(50), nullable=True)
    sign_status = Column(String(100), nullable=True, default="Signed")
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ShopTaxInvoice(Base):
    """2. Shop Tax Invoice"""
    __tablename__ = "shop_tax_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(50), nullable=False, unique=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    customer_name = Column(String(250), nullable=False)
    customer_phone = Column(String(30), nullable=True)
    product_name = Column(String(250), nullable=False)
    hsn_code = Column(String(50), nullable=True, default="3808")
    qty = Column(Numeric(10, 2), nullable=False, default=1.0)
    rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ShopRetailBill(Base):
    """3. Retail Cash Bill (PPO / INSAT / BLG/48)"""
    __tablename__ = "shop_retail_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String(50), nullable=False, unique=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    tin_no = Column(String(50), nullable=True, default="29540268502")
    customer_name = Column(String(250), nullable=False)
    particulars = Column(Text, nullable=False)
    rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    seller_signature = Column(String(100), nullable=True, default="Seller Signed")
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PesticideSaleEntry(Base):
    """4. Pesticide Sale Register"""
    __tablename__ = "pesticide_sale_register"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    customer_name = Column(String(250), nullable=False)
    product_name = Column(String(250), nullable=False, default="Boric Acid")
    qty = Column(Numeric(10, 2), nullable=False, default=1.0)
    rate = Column(Numeric(12, 2), nullable=False, default=0.0)
    amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    batch_no = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PesticideProductMaster(Base):
    """Product Master Table storing English and Marathi Product Names"""
    __tablename__ = "pesticide_product_master"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=True, default="General")
    name_en = Column(String(200), nullable=False, unique=True, index=True)
    name_mr = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default=func.now())



