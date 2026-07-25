export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export interface OfficeMaster {
  id: number;
  gst_no: string;
  phone1: string | null;
  phone2: string | null;
  office_name: string;
  address: string | null;
}

export interface TransactionType {
  id: number;
  name: string;
  cash_book_column: string;
  ledger_account: string;
  entry_type?: string; // "CREDIT", "DEBIT", "BOTH"
  display_order: number;
}

export interface Customer {
  id: number;
  customer_id: string;
  salutation: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name: string;
  mobile_no?: string | null;
  address?: string | null;
  aadhaar_no?: string | null;
  aadhaar_doc_path?: string | null;
  pan_no?: string | null;
  pan_doc_path?: string | null;
  opening_balance: number;
  status: string;
  created_at?: string | null;
}

export interface CustomerCreate {
  customer_id?: string;
  salutation?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  mobile_no?: string;
  address?: string;
  aadhaar_no?: string;
  aadhaar_doc_path?: string;
  pan_no?: string;
  pan_doc_path?: string;
  opening_balance?: number;
  status?: string;
}

export interface Transaction {
  id: number;
  date: string;
  cash_memo_no: string;
  customer_id?: string | null;
  mobile_no?: string | null;
  customer_name: string;
  particulars: string | null;
  transaction_type_id: number;
  entry_nature?: string; // "CREDIT" or "DEBIT"
  amount_rs: number;
  amount_ps: number;
  remarks: string | null;
  created_by: string | null;
  status?: string;
  created_at: string | null;
  transaction_type: TransactionType | null;
}

export interface TransactionCreate {
  date: string;
  customer_id?: string;
  mobile_no?: string;
  customer_name: string;
  particulars?: string;
  transaction_type_id: number;
  entry_nature?: string; // "CREDIT" or "DEBIT"
  amount_rs: number;
  amount_ps?: number;
  remarks?: string;
  created_by?: string;
  status?: string;
}

export interface CashBookRow {
  id: number;
  date: string;
  lf_no: string;
  name: string;
  cash_memo_no: string;
  transaction_type: string;
  cash_book_column: string;
  amount: number;
  shares: number;
  purchases: number;
  commissions: number;
  loan_ac: number;
  interest: number;
  pigmi_comm: number;
  bank_current: number;
  advance: number;
  lakshmi_pigmi_deposit: number;
  vegetable_comm: number;
  sundary_ac: number;
  cash_sales: number;
  pesticide_sales: number;
  cold_storage_adv: number;
  lakshmi_pigmi_deposit_loan: number;
  lakshmi_pigmi_deposit_interest: number;
  total: number;
}

export interface LedgerRow {
  month: number;
  year: number;
  month_year_label: string;
  account: string;
  receipt: number;
  debit: number;
  payable: number;
  receivable: number;
  remarks: string | null;
}

export interface AccountMaster {
  id: number;
  account_name: string;
}

export const CASH_BOOK_COLUMNS: { key: keyof CashBookRow; label: string }[] = [
  { key: "shares", label: "Shares" },
  { key: "purchases", label: "Purchases" },
  { key: "commissions", label: "Commissions" },
  { key: "loan_ac", label: "Loan a/c" },
  { key: "interest", label: "Interest" },
  { key: "pigmi_comm", label: "Pigmi Comm." },
  { key: "bank_current", label: "Bank Current" },
  { key: "advance", label: "Advance" },
  { key: "lakshmi_pigmi_deposit", label: "Lakshmi Pigmi Deposit" },
  { key: "vegetable_comm", label: "Vegetable Comm." },
  { key: "sundary_ac", label: "Sundary a/c" },
  { key: "cash_sales", label: "Cash Sales" },
  { key: "pesticide_sales", label: "Pesticide Sales" },
  { key: "cold_storage_adv", label: "Cold Storage Adv" },
  { key: "lakshmi_pigmi_deposit_loan", label: "Lakshmi Pigmi Deposit Loan" },
  { key: "lakshmi_pigmi_deposit_interest", label: "Lakshmi Pigmi Deposit Interest" },
];

export const CREDIT_BOOK_COLUMNS: { key: keyof CashBookRow; label: string }[] = [
  { key: "shares", label: "Shares" },
  { key: "commissions", label: "Commissions" },
  { key: "interest", label: "Interest" },
  { key: "pigmi_comm", label: "Pigmi Comm." },
  { key: "lakshmi_pigmi_deposit", label: "Lakshmi Pigmi Deposit" },
  { key: "vegetable_comm", label: "Vegetable Comm." },
  { key: "cash_sales", label: "Cash Sales" },
  { key: "pesticide_sales", label: "Pesticide Sales" },
  { key: "sundary_ac", label: "Sundary a/c" },
];

export const DEBIT_BOOK_COLUMNS: { key: keyof CashBookRow; label: string }[] = [
  { key: "purchases", label: "Purchases" },
  { key: "loan_ac", label: "Loan a/c" },
  { key: "bank_current", label: "Bank Current" },
  { key: "advance", label: "Advance" },
  { key: "cold_storage_adv", label: "Cold Storage Adv" },
  { key: "lakshmi_pigmi_deposit_loan", label: "Lakshmi Pigmi Deposit Loan" },
  { key: "lakshmi_pigmi_deposit_interest", label: "Lakshmi Pigmi Deposit Interest" },
  { key: "sundary_ac", label: "Sundary a/c" },
];
