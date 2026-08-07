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
  aadhaar_back_doc_path?: string | null;
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
  aadhaar_back_doc_path?: string;
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
  customer_id?: string;
  lf_no: string;
  name: string;
  particulars?: string;
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

// ─── Cashier Types ──────────────────────────────────────────────────────────

export interface VoucherItemRow {
  id: string;
  particular: string;
  ref_no?: string;
  amount: number;
  cgst_rate: number;
  sgst_rate: number;
  total_amount: number;
}

export interface CashPaymentVoucher {
  id: number;
  voucher_no: string;
  date: string;
  paid_to: string;
  purpose_remarks?: string | null;
  details_of_expenditure?: string | null;
  amount_rs: number;
  amount_words?: string | null;
  receipt_doc_path?: string | null;
  payment_mode?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bank_name?: string | null;
  created_by?: string | null;
  status?: string;
  created_at?: string | null;
}

export interface CashPaymentVoucherCreate {
  date: string;
  voucher_no?: string;
  paid_to: string;
  purpose_remarks?: string;
  details_of_expenditure?: string;
  amount_rs: number;
  amount_words?: string;
  receipt_doc_path?: string;
  payment_mode?: string;
  cheque_no?: string;
  cheque_date?: string;
  bank_name?: string;
  created_by?: string;
  status?: string;
}

export interface CashReceiptVoucher {
  id: number;
  bill_no: string;
  date: string;
  gst_no?: string | null;
  phone_no?: string | null;
  received_from: string;
  particulars?: string | null;
  loan_amount: number;
  interest_amount: number;
  total_amount: number;
  receipt_doc_path?: string | null;
  payment_mode?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bank_name?: string | null;
  created_by?: string | null;
  status?: string;
  created_at?: string | null;
}

export interface CashReceiptVoucherCreate {
  date: string;
  bill_no?: string;
  gst_no?: string;
  phone_no?: string;
  received_from: string;
  particulars?: string;
  loan_amount?: number;
  interest_amount?: number;
  total_amount?: number;
  receipt_doc_path?: string;
  payment_mode?: string;
  cheque_no?: string;
  cheque_date?: string;
  bank_name?: string;
  created_by?: string;
  status?: string;
}

export const RENT_PARTICULARS_OPTIONS = [
  "Cold Storage Shop Rent",
  "Head Office Building Rent",
  "Cold Storage Godown Rent",
  "Under Godown Rent",
  "Onion Market Godown Rent",
  "New Shop Rent",
  "Cold Storage Charges",
];

export const RECEIPT_PARTICULARS_OPTIONS = [
  "Pooja Expenses",
  "Sou Lakshmi Pigmy Deposit Loan",
  "Sundrey A/C",
  "Rikshaw charges",
  "PF A/C",
  "Mobile Recharge",
  "The Pioneer Urban Bank CC",
  "ESI A/C",
  "Administrative charges",
  "Sou Lakshmi Pigmy Deposit",
  "Insurance Fund",
  "FD A/C",
  "FD Interest",
  "Daily Wages",
  "Electric Power A/C",
  "Advance A/C",
  "The Pioneer Urban Bank CA",
  "Printing And Stationary",
  "Seed Section Plastic Bag",
  "Contigency A/C",
  "CGST paid (9%)",
  "SGST paid (9%)",
  "CGST paid (2.5%)",
  "SGST paid (2.5%)",
  "GST Feeding fee",
  "Pesticide purchases",
  "Meeting allowance",
  "Legal Fee",
  "Sou Lakshmi Pigmy Deposit Interest",
  "Seed purchase",
  "PF and other contribution",
  "ESI and other contribution",
  "PAY A/C",
  "Union Bank of India",
  "TDS A/C",
  "Sou Lakshmi Pigmy Deposit commission",
  "Advance a/c",
  "Pesticide sale",
  "Seed sale",
];

export const PAYMENT_PARTICULARS_OPTIONS = [
  "Sou Lakshmi Pigmy Deposit",
  "Pesticide sales",
  "CGST(9%)",
  "SGST(9%)",
  "CGST received (2.5%)",
  "SGST received (2.5%)",
  "Union Bank of India",
  "The Pioneer Urban Bank CC",
  "FD A/C",
  "Cold Stove Godawan",
  "Head Office Building rent",
  "Onion Market Godawan",
  "Under Godawan Rent",
  "The Pioneer Urban Bank CA",
  "Sou Lakshmi Pigmy Deposit commission",
  "Sou Lakshmi Pigmy Deposit Loan",
  "Sou Lakshmi Pigmy Deposit Interest",
  "Electric Power A/C",
  "Shares A/C",
  "Sundrey A/C",
  "Advance A/C",
  "PF A/C",
  "ESI A/C",
  "Vegetable Commission",
  "Daily wages pay",
  "Legal Fee",
  "License renewal fee",
  "Seeds purchase a/c",
  "Pesticide purchase a/c",
];


export interface RentBill {
  id: number;
  invoice_no: string;
  date: string;
  consignee_name: string;
  consignee_address?: string | null;
  particulars?: string | null;
  hsn_sac?: string | null;
  gst_rate: number;
  qty: number;
  rate: number;
  per?: string | null;
  amount: number;
  igst_amount: number;
  sgst_amount: number;
  cgst_amount: number;
  total_amount: number;
  tax_amount_words?: string | null;
  payment_mode?: string | null;
  cheque_no?: string | null;
  cheque_date?: string | null;
  bank_name?: string | null;
  created_by?: string | null;
  status?: string;
  created_at?: string | null;
}

export interface RentBillCreate {
  date: string;
  invoice_no?: string;
  consignee_name: string;
  consignee_address?: string;
  particulars?: string;
  hsn_sac?: string;
  gst_rate?: number;
  qty?: number;
  rate?: number;
  per?: string;
  amount?: number;
  igst_amount?: number;
  sgst_amount?: number;
  cgst_amount?: number;
  total_amount?: number;
  tax_amount_words?: string;
  payment_mode?: string;
  cheque_no?: string;
  cheque_date?: string;
  bank_name?: string;
  created_by?: string;
  status?: string;
}

export interface CashScrollBookEntry {
  id: number;
  date: string;
  page_no?: string | null;
  voucher_no?: string | null;
  from_received_paid: string;
  received_amount: number;
  paid_amount: number;
  cheque_amount: number;
  created_by?: string | null;
  created_at?: string | null;
}

export interface CashScrollBookCreate {
  date: string;
  page_no?: string;
  voucher_no?: string;
  from_received_paid: string;
  received_amount?: number;
  paid_amount?: number;
  cheque_amount?: number;
  created_by?: string;
}

export interface ChequeIssueBookEntry {
  id: number;
  issue_date: string;
  name_to_whom_issued: string;
  cheque_no: string;
  amount_rs: number;
  remarks?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface ChequeIssueBookCreate {
  issue_date: string;
  name_to_whom_issued: string;
  cheque_no: string;
  amount_rs: number;
  remarks?: string;
  created_by?: string;
}

export interface CashierAuditSummary {
  start_date: string;
  end_date: string;
  total_payment_vouchers_count: number;
  total_payment_amount: number;
  total_receipt_vouchers_count: number;
  total_receipt_amount: number;
  total_rent_bills_count: number;
  total_rent_bill_amount: number;
  total_scroll_received: number;
  total_scroll_paid: number;
  total_scroll_cheque: number;
  total_cheques_issued_count: number;
  total_cheques_issued_amount: number;
}


// ─── SHOP KEEPER TYPES ────────────────────────────────────────────────────────

export interface ShopSellingRateEntry {
  id: number;
  date: string;
  name: string;
  particulars: string;
  qty: number;
  amount: number;
  sgst: number;
  cgst: number;
  hmall: number;
  motor_rent: number;
  total_amount: number;
  net_rate: number;
  selling_rate: number;
  stock_book_no?: string | null;
  sign_status?: string | null;
  doc_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface ShopSellingRateCreate {
  date: string;
  name: string;
  particulars: string;
  qty?: number;
  amount?: number;
  sgst?: number;
  cgst?: number;
  hmall?: number;
  motor_rent?: number;
  total_amount?: number;
  net_rate?: number;
  selling_rate?: number;
  stock_book_no?: string;
  sign_status?: string;
  doc_path?: string;
  created_by?: string;
}

export interface ShopTaxInvoice {
  id: number;
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_phone?: string | null;
  product_name: string;
  hsn_code?: string | null;
  qty: number;
  rate: number;
  amount: number;
  sgst_rate?: number;
  sgst_amount?: number;
  cgst_rate?: number;
  cgst_amount?: number;
  total_amount?: number;
  doc_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface ShopTaxInvoiceCreate {
  date: string;
  invoice_no?: string;
  customer_name: string;
  customer_phone?: string;
  product_name: string;
  hsn_code?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  cgst_rate?: number;
  cgst_amount?: number;
  total_amount?: number;
  doc_path?: string;
  created_by?: string;
}

export interface ShopRetailBill {
  id: number;
  bill_no: string;
  date: string;
  tin_no?: string | null;
  customer_name: string;
  particulars: string;
  qty?: number;
  rate: number;
  amount: number;
  seller_signature?: string | null;
  doc_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface ShopRetailBillCreate {
  date: string;
  bill_no?: string;
  tin_no?: string;
  customer_name: string;
  particulars: string;
  qty?: number;
  rate?: number;
  amount?: number;
  seller_signature?: string;
  doc_path?: string;
  created_by?: string;
}

export interface PesticideSaleEntry {
  id: number;
  date: string;
  customer_name: string;
  product_name: string;
  qty: number;
  rate: number;
  amount: number;
  batch_no?: string | null;
  remarks?: string | null;
  doc_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface PesticideSaleEntryCreate {
  date: string;
  customer_name: string;
  product_name: string;
  qty?: number;
  rate?: number;
  amount?: number;
  batch_no?: string;
  remarks?: string;
  doc_path?: string;
  created_by?: string;
}

export interface ShopkeeperAuditSummary {
  start_date: string;
  end_date: string;
  total_selling_rate_entries_count: number;
  total_selling_rate_amount: number;
  total_tax_invoices_count: number;
  total_tax_invoice_amount: number;
  total_retail_bills_count: number;
  total_retail_bill_amount: number;
  total_pesticide_sales_count: number;
  total_pesticide_sale_amount: number;
  grand_shop_sales_total: number;
}

export const PESTICIDE_PRODUCT_LIST = [
  // Insecticides
  "Chlorpyriphos",
  "Imidacloprid",
  "Thiamethoxam",
  "Acetamiprid",
  "Fipronil",
  "Lambda Cyhalothrin",
  "Cypermethrin",
  "Profenofos",
  "Emamectin Benzoate",
  "Spinosad",
  "Indoxacarb",
  "Cartap Hydrochloride",
  "Diafenthiuron",
  "Buprofezin",
  "Dinotefuran",
  "Clothianidin",
  "Acephate",
  "Quinalphos",
  "Novaluron",
  "Tolfenpyrad",
  "Chlorpyrifos 20% EC",
  "Monocrotophos 36% SL",
  "Malathion 50% EC",

  // Fungicides
  "Mancozeb",
  "Carbendazim",
  "Copper Oxychloride",
  "Metalaxyl + Mancozeb",
  "Hexaconazole",
  "Propiconazole",
  "Azoxystrobin",
  "Tebuconazole",
  "Tricyclazole",
  "Sulphur 80% WDG",
  "Captan",
  "Cymoxanil",
  "Validamycin",
  "Kasugamycin",
  "Fosetyl Aluminium",
  "Mancozeb 75% WP",
  "Copper Oxychloride 50% WP",
  "Carbendazim 50% WP",

  // Herbicides (Weed Killers)
  "Glyphosate",
  "Pendimethalin",
  "Butachlor",
  "Atrazine",
  "Oxyfluorfen",
  "Paraquat Dichloride",
  "Pretilachlor",
  "2,4-D Amine Salt",
  "Metribuzin",
  "Pyrazosulfuron Ethyl",
  "Bispyribac Sodium",
  "Imazethapyr",
  "Quizalofop Ethyl",
  "Fenoxaprop-P-Ethyl",

  // Rodenticides
  "Zinc Phosphide",
  "Bromadiolone",
  "Ratol Cake",
  "Ratol Paste",
  "Ratol Powder",
  "Ratol Pellets",

  // Bio-Pesticides
  "Neem Oil",
  "Neem Oil 10000 PPM",
  "Beauveria bassiana",
  "Metarhizium anisopliae",
  "Verticillium lecanii",
  "Bacillus thuringiensis (Bt)",
  "Trichoderma viride",
  "Pseudomonas fluorescens",
  "Paecilomyces lilacinus",

  // Plant Growth Regulators
  "Gibberellic Acid (GA3)",
  "Naphthalene Acetic Acid (NAA)",
  "Triacontanol",
  "Seaweed Extract",
  "Humic Acid",
  "Amino Acid Liquid",
  "Fulvic Acid",

  // Common Agricultural Products
  "Boric Acid",
  "Boric Powder",
  "Terminose",
  "Amish-B",
  "Amish-C",
  "Trichoderma",
  "Spray Pump Battery 16L",
  "Brass Nozzle Set",
];

export interface MeetingNotice {
  id: number;
  notice_no: string;
  meeting_date: string;
  meeting_time: string;
  time_of_day: string;
  recipient_name: string;
  meeting_type: string;
  agenda_subjects: string;
  doc_path?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface MeetingNoticeCreate {
  notice_no?: string;
  meeting_date: string;
  meeting_time?: string;
  time_of_day?: string;
  recipient_name: string;
  meeting_type?: string;
  agenda_subjects: string;
  doc_path?: string;
  created_by?: string;
}



