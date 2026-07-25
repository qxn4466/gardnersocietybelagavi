from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Text, Date, Numeric,
    ForeignKey, DateTime, func
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
    aadhaar_doc_path = Column(String(300), nullable=True)
    pan_no = Column(String(20), nullable=True)
    pan_doc_path = Column(String(300), nullable=True)
    opening_balance = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())


