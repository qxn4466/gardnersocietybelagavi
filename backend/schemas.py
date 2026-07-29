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
    customer_id: Optional[str] = ""
    lf_no: str
    name: str
    particulars: Optional[str] = ""
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


# ─── Cashier Schemas ─────────────────────────────────────────────────────────

# 1. Payment Voucher
class CashPaymentVoucherCreate(BaseModel):
    date: date
    voucher_no: Optional[str] = None
    paid_to: str
    purpose_remarks: Optional[str] = None
    details_of_expenditure: Optional[str] = None
    amount_rs: Decimal
    amount_words: Optional[str] = None
    receipt_doc_path: Optional[str] = None
    created_by: Optional[str] = None
    status: Optional[str] = "POSTED"


class CashPaymentVoucherOut(CashPaymentVoucherCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    voucher_no: str
    created_at: Optional[datetime] = None


# 2. Receipt Voucher (Cash Memo)
class CashReceiptVoucherCreate(BaseModel):
    date: date
    bill_no: Optional[str] = None
    gst_no: Optional[str] = None
    phone_no: Optional[str] = None
    received_from: str
    particulars: Optional[str] = None
    loan_amount: Decimal = Decimal("0.00")
    interest_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")
    receipt_doc_path: Optional[str] = None
    created_by: Optional[str] = None
    status: Optional[str] = "POSTED"


class CashReceiptVoucherOut(CashReceiptVoucherCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bill_no: str
    created_at: Optional[datetime] = None



# 3. Rent Bill (Tax Invoice)
class RentBillCreate(BaseModel):
    date: date
    invoice_no: Optional[str] = None
    consignee_name: str
    consignee_address: Optional[str] = None
    particulars: Optional[str] = None
    hsn_sac: Optional[str] = "997212"
    gst_rate: Decimal = Decimal("18.00")
    qty: Decimal = Decimal("1.00")
    rate: Decimal = Decimal("0.00")
    per: Optional[str] = "Month"
    amount: Decimal = Decimal("0.00")
    igst_amount: Decimal = Decimal("0.00")
    sgst_amount: Decimal = Decimal("0.00")
    cgst_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")
    tax_amount_words: Optional[str] = None
    created_by: Optional[str] = None
    status: Optional[str] = "POSTED"


class RentBillOut(RentBillCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    created_at: Optional[datetime] = None


# 4. Cash Scroll Book
class CashScrollBookCreate(BaseModel):
    date: date
    page_no: Optional[str] = None
    voucher_no: Optional[str] = None
    from_received_paid: str
    received_amount: Decimal = Decimal("0.00")
    paid_amount: Decimal = Decimal("0.00")
    cheque_amount: Decimal = Decimal("0.00")
    created_by: Optional[str] = None


class CashScrollBookOut(CashScrollBookCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# 5. Cheque Issue Book
class ChequeIssueBookCreate(BaseModel):
    issue_date: date
    name_to_whom_issued: str
    cheque_no: str
    amount_rs: Decimal
    remarks: Optional[str] = None
    created_by: Optional[str] = None


class ChequeIssueBookOut(ChequeIssueBookCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None


# 6. Cashier Audit Summary
class CashierAuditSummary(BaseModel):
    start_date: str
    end_date: str
    total_payment_vouchers_count: int
    total_payment_amount: Decimal
    total_receipt_vouchers_count: int
    total_receipt_amount: Decimal
    total_rent_bills_count: int
    total_rent_bill_amount: Decimal
    total_scroll_received: Decimal
    total_scroll_paid: Decimal
    total_scroll_cheque: Decimal
    total_cheques_issued_count: int
    total_cheques_issued_amount: Decimal


