from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ─── Auth / User ──────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: str



# ─── Office Master ─────────────────────────────────────────────────────────────
class OfficeMasterBase(BaseModel):
    gst_no: str
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    office_name: str
    address: Optional[str] = None


class OfficeMasterOut(OfficeMasterBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ─── Transaction Type Master ────────────────────────────────────────────────────
class TransactionTypeBase(BaseModel):
    name: str
    cash_book_column: str
    ledger_account: str
    entry_type: Optional[str] = "CREDIT"
    display_order: int = 0


class TransactionTypeOut(TransactionTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ─── Account Master ─────────────────────────────────────────────────────────────
class AccountMasterBase(BaseModel):
    account_name: str


class AccountMasterOut(AccountMasterBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ─── Transaction ────────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    date: date
    customer_id: Optional[str] = None
    mobile_no: Optional[str] = None
    customer_name: str
    particulars: Optional[str] = None
    transaction_type_id: int
    entry_nature: Optional[str] = "CREDIT"
    amount_rs: Decimal
    amount_ps: Decimal = Decimal("0.00")
    remarks: Optional[str] = None
    created_by: Optional[str] = None
    status: Optional[str] = "POSTED"


class TransactionOut(TransactionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cash_memo_no: str
    status: str = "POSTED"
    created_at: Optional[datetime] = None
    transaction_type: Optional[TransactionTypeOut] = None


# ─── Cash Book Row ──────────────────────────────────────────────────────────────
class CashBookRow(BaseModel):
    id: int
    date: date
    lf_no: str
    name: str
    cash_memo_no: str
    transaction_type: str
    cash_book_column: str
    amount: Decimal
    # All 16 columns — zero if not applicable
    shares: Decimal = Decimal("0")
    purchases: Decimal = Decimal("0")
    commissions: Decimal = Decimal("0")
    loan_ac: Decimal = Decimal("0")
    interest: Decimal = Decimal("0")
    pigmi_comm: Decimal = Decimal("0")
    bank_current: Decimal = Decimal("0")
    advance: Decimal = Decimal("0")
    lakshmi_pigmi_deposit: Decimal = Decimal("0")
    vegetable_comm: Decimal = Decimal("0")
    sundary_ac: Decimal = Decimal("0")
    cash_sales: Decimal = Decimal("0")
    pesticide_sales: Decimal = Decimal("0")
    cold_storage_adv: Decimal = Decimal("0")
    lakshmi_pigmi_deposit_loan: Decimal = Decimal("0")
    lakshmi_pigmi_deposit_interest: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


# ─── Ledger Row ─────────────────────────────────────────────────────────────────
class LedgerRow(BaseModel):
    month: int
    year: int
    month_year_label: str
    account: str
    receipt: Decimal = Decimal("0")
    debit: Decimal = Decimal("0")
    payable: Decimal = Decimal("0")
    receivable: Decimal = Decimal("0")
    remarks: Optional[str] = None


# ─── Next Cash Memo ─────────────────────────────────────────────────────────────
class NextMemoResponse(BaseModel):
    cash_memo_no: str


# ─── Customer / Savings Account ─────────────────────────────────────────────────
class CustomerBase(BaseModel):
    salutation: Optional[str] = "Mr."
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    mobile_no: Optional[str] = None
    address: Optional[str] = None
    aadhaar_no: Optional[str] = None
    aadhaar_doc_path: Optional[str] = None
    aadhaar_back_doc_path: Optional[str] = None
    pan_no: Optional[str] = None
    pan_doc_path: Optional[str] = None
    opening_balance: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "ACTIVE"


class CustomerCreate(CustomerBase):
    customer_id: Optional[str] = None  # If not provided, backend will auto-generate 10-digit ID


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: str
    full_name: str
    created_at: Optional[datetime] = None

