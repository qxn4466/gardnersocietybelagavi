// ─── Static UI Translation Dictionary ───────────────────────────────────────
// All static labels, headings, buttons, and table headers in English + Marathi.
// Dynamic user-entered data (names, particulars, remarks) is handled via
// the IndicTrans2 microservice through useTranslateData hook.

export type Lang = 'en' | 'mr';

export type TranslationKey =
  // ── Navigation / Sidebar ──────────────────────────────────────────────────
  | 'nav_credit_account'
  | 'nav_savings_accounts'
  | 'nav_credit_book'
  | 'nav_cash_book'
  | 'nav_debit_book'
  | 'nav_general_ledger'
  | 'nav_audit_package'
  | 'nav_cashier_dashboard'
  | 'nav_payment_voucher'
  | 'nav_receipt_voucher'
  | 'nav_rent_bill'
  | 'nav_cash_scroll'
  | 'nav_cheque_issue'
  | 'nav_cashier_audit'
  // ── Header ────────────────────────────────────────────────────────────────
  | 'header_logout'
  | 'header_menu'
  | 'header_level1'
  | 'header_level2'
  | 'header_level3'
  // ── Common Buttons ────────────────────────────────────────────────────────
  | 'btn_save'
  | 'btn_reset'
  | 'btn_print'
  | 'btn_refresh'
  | 'btn_search'
  | 'btn_add'
  | 'btn_edit'
  | 'btn_delete'
  | 'btn_cancel'
  | 'btn_submit'
  | 'btn_close'
  | 'btn_download'
  | 'btn_upload'
  | 'btn_view'
  | 'btn_new_entry'
  | 'btn_load_data'
  | 'btn_generate_report'
  // ── Common Form Labels ────────────────────────────────────────────────────
  | 'lbl_date'
  | 'lbl_name'
  | 'lbl_amount'
  | 'lbl_remarks'
  | 'lbl_status'
  | 'lbl_mobile'
  | 'lbl_address'
  | 'lbl_total'
  | 'lbl_receipt'
  | 'lbl_debit'
  | 'lbl_credit'
  | 'lbl_balance'
  | 'lbl_particulars'
  | 'lbl_transaction_type'
  | 'lbl_entry_type'
  | 'lbl_from_date'
  | 'lbl_to_date'
  | 'lbl_search'
  | 'lbl_filter'
  | 'lbl_actions'
  | 'lbl_sr_no'
  | 'lbl_memo_no'
  | 'lbl_customer_id'
  | 'lbl_account_no'
  | 'lbl_salutation'
  | 'lbl_first_name'
  | 'lbl_middle_name'
  | 'lbl_last_name'
  | 'lbl_full_name'
  | 'lbl_opening_balance'
  | 'lbl_created_by'
  | 'lbl_created_at'
  | 'lbl_month'
  | 'lbl_year'
  // ── Credit Account Form ───────────────────────────────────────────────────
  | 'credit_form_title'
  | 'credit_form_subtitle'
  | 'credit_tab_new'
  | 'credit_tab_drafts'
  | 'credit_tab_records'
  | 'credit_lbl_cash_memo'
  | 'credit_lbl_entry_nature'
  | 'credit_lbl_cgst'
  | 'credit_lbl_sgst'
  | 'credit_lbl_rs'
  | 'credit_lbl_ps'
  | 'credit_lbl_amount_words'
  | 'credit_lbl_add_row'
  | 'credit_lbl_particulars_table'
  | 'credit_lbl_description'
  | 'credit_filter_all'
  | 'credit_filter_credit'
  | 'credit_filter_debit'
  | 'credit_msg_saved'
  | 'credit_msg_updated'
  | 'credit_msg_deleted'
  | 'credit_msg_draft_saved'
  | 'credit_confirm_delete'
  | 'credit_confirm_clear_data'
  // ── Savings Accounts ─────────────────────────────────────────────────────
  | 'savings_title'
  | 'savings_subtitle'
  | 'savings_tab_new'
  | 'savings_tab_list'
  | 'savings_lbl_aadhaar'
  | 'savings_lbl_aadhaar_front'
  | 'savings_lbl_aadhaar_back'
  | 'savings_lbl_pan'
  | 'savings_lbl_pan_doc'
  | 'savings_lbl_doc_upload'
  | 'savings_lbl_account_status'
  | 'savings_lbl_active'
  | 'savings_lbl_inactive'
  | 'savings_lbl_verify_docs'
  | 'savings_msg_created'
  | 'savings_msg_updated'
  | 'savings_msg_load_error'
  // ── Cash/Credit Book ─────────────────────────────────────────────────────
  | 'cashbook_title'
  | 'cashbook_subtitle'
  | 'cashbook_lbl_lf_no'
  | 'cashbook_lbl_shares'
  | 'cashbook_lbl_purchases'
  | 'cashbook_lbl_commissions'
  | 'cashbook_lbl_loan_ac'
  | 'cashbook_lbl_interest'
  | 'cashbook_lbl_pigmi_comm'
  | 'cashbook_lbl_bank_current'
  | 'cashbook_lbl_advance'
  | 'cashbook_lbl_lakshmi_pigmi'
  | 'cashbook_lbl_vegetable_comm'
  | 'cashbook_lbl_sundary_ac'
  | 'cashbook_lbl_cash_sales'
  | 'cashbook_lbl_pesticide_sales'
  | 'cashbook_lbl_cold_storage'
  | 'cashbook_lbl_lakshmi_loan'
  | 'cashbook_lbl_lakshmi_interest'
  // ── Debit Book ────────────────────────────────────────────────────────────
  | 'debitbook_title'
  | 'debitbook_subtitle'
  // ── General Ledger ────────────────────────────────────────────────────────
  | 'ledger_title'
  | 'ledger_subtitle'
  | 'ledger_lbl_account'
  | 'ledger_lbl_month_year'
  | 'ledger_lbl_payable'
  | 'ledger_lbl_receivable'
  | 'ledger_lbl_grand_total'
  // ── Audit Package ─────────────────────────────────────────────────────────
  | 'audit_title'
  | 'audit_subtitle'
  | 'audit_lbl_cover_page'
  | 'audit_lbl_include_credit'
  | 'audit_lbl_include_debit'
  | 'audit_lbl_include_ledger'
  | 'audit_lbl_include_customers'
  | 'audit_lbl_sections'
  | 'audit_lbl_date_range'
  | 'audit_btn_print_all'
  | 'audit_btn_preset_june'
  // ── Login ─────────────────────────────────────────────────────────────────
  | 'login_title'
  | 'login_subtitle'
  | 'login_lbl_username'
  | 'login_lbl_password'
  | 'login_btn'
  | 'login_error'
  // ── Receipt / Modal ───────────────────────────────────────────────────────
  | 'receipt_title'
  | 'receipt_lbl_cash_memo'
  | 'receipt_lbl_received_from'
  | 'receipt_lbl_amount'
  | 'receipt_lbl_amount_words'
  | 'receipt_lbl_on_account_of'
  | 'receipt_lbl_being'
  | 'receipt_lbl_rs'
  | 'receipt_lbl_ps'
  | 'receipt_lbl_for_office'
  | 'receipt_lbl_authorised_sign'
  | 'receipt_lbl_cashier'
  // ── Customer Statement Modal ──────────────────────────────────────────────
  | 'stmt_title'
  | 'stmt_lbl_account_holder'
  | 'stmt_lbl_account_no'
  | 'stmt_lbl_transactions'
  | 'stmt_lbl_opening_bal'
  | 'stmt_lbl_closing_bal'
  | 'stmt_lbl_no_transactions'
  // ── Print / Sidebar labels ────────────────────────────────────────────────
  | 'print_btn'
  | 'sidebar_title'
  | 'sidebar_section_main'
  | 'sidebar_section_reports'
  // ── Misc ──────────────────────────────────────────────────────────────────
  | 'lbl_loading'
  | 'lbl_no_data'
  | 'lbl_error'
  | 'lbl_success'
  | 'lbl_confirm'
  | 'lbl_yes'
  | 'lbl_no'
  | 'lbl_rs'
  | 'lbl_paise'
  | 'lbl_rupees_only'
  | 'lbl_grand_total'
  | 'lbl_totals';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  // Navigation
  nav_credit_account: 'Credit Account Form',
  nav_savings_accounts: 'Savings Accounts',
  nav_credit_book: 'Credit Book',
  nav_cash_book: 'Cash Book',
  nav_debit_book: 'Debit Book',
  nav_general_ledger: 'General Ledger',
  nav_audit_package: 'Audit Package',
  nav_cashier_dashboard: 'Cashier Dashboard',
  nav_payment_voucher: '1. Cash Payment Voucher',
  nav_receipt_voucher: '2. Cash Receipt Voucher',
  nav_rent_bill: '3. Rent Bill Form',
  nav_cash_scroll: '4. Cash Scroll Book',
  nav_cheque_issue: '5. Cheque Issue Book',
  nav_cashier_audit: '6. Cashier Audit Form',

  // Header
  header_logout: 'Logout',
  header_menu: 'Menu',
  header_level1: 'Level 1 · Data Entry',
  header_level2: 'Level 2 · Daily Cash Book',
  header_level3: 'Level 3 · General Ledger',
  // Buttons
  btn_save: 'Save',
  btn_reset: 'Reset',
  btn_print: 'Print',
  btn_refresh: 'Refresh',
  btn_search: 'Search',
  btn_add: 'Add',
  btn_edit: 'Edit',
  btn_delete: 'Delete',
  btn_cancel: 'Cancel',
  btn_submit: 'Submit',
  btn_close: 'Close',
  btn_download: 'Download',
  btn_upload: 'Upload',
  btn_view: 'View',
  btn_new_entry: 'New Entry',
  btn_load_data: 'Load Data',
  btn_generate_report: 'Generate Report',
  // Common Form Labels
  lbl_date: 'Date',
  lbl_name: 'Name',
  lbl_amount: 'Amount',
  lbl_remarks: 'Remarks',
  lbl_status: 'Status',
  lbl_mobile: 'Mobile No.',
  lbl_address: 'Address',
  lbl_total: 'Total',
  lbl_receipt: 'Receipt',
  lbl_debit: 'Debit',
  lbl_credit: 'Credit',
  lbl_balance: 'Balance',
  lbl_particulars: 'Particulars',
  lbl_transaction_type: 'Transaction Type',
  lbl_entry_type: 'Entry Type',
  lbl_from_date: 'From Date',
  lbl_to_date: 'To Date',
  lbl_search: 'Search',
  lbl_filter: 'Filter',
  lbl_actions: 'Actions',
  lbl_sr_no: 'Sr. No.',
  lbl_memo_no: 'Cash Memo No.',
  lbl_customer_id: 'Customer ID',
  lbl_account_no: 'Account No.',
  lbl_salutation: 'Salutation',
  lbl_first_name: 'First Name',
  lbl_middle_name: 'Middle Name',
  lbl_last_name: 'Last Name',
  lbl_full_name: 'Full Name',
  lbl_opening_balance: 'Opening Balance',
  lbl_created_by: 'Created By',
  lbl_created_at: 'Created At',
  lbl_month: 'Month',
  lbl_year: 'Year',
  // Credit Account Form
  credit_form_title: 'Credit Account Form',
  credit_form_subtitle: 'Record credit and debit transactions',
  credit_tab_new: 'New Entry',
  credit_tab_drafts: 'Drafts',
  credit_tab_records: 'All Records',
  credit_lbl_cash_memo: 'Cash Memo No.',
  credit_lbl_entry_nature: 'Entry Nature',
  credit_lbl_cgst: 'CGST',
  credit_lbl_sgst: 'SGST',
  credit_lbl_rs: 'Rs.',
  credit_lbl_ps: 'Ps.',
  credit_lbl_amount_words: 'Amount in Words',
  credit_lbl_add_row: 'Add Row',
  credit_lbl_particulars_table: 'Particulars',
  credit_lbl_description: 'Description',
  credit_filter_all: 'All',
  credit_filter_credit: 'Credit',
  credit_filter_debit: 'Debit',
  credit_msg_saved: 'Transaction saved successfully!',
  credit_msg_updated: 'Transaction updated successfully!',
  credit_msg_deleted: 'Transaction deleted.',
  credit_msg_draft_saved: 'Draft saved.',
  credit_confirm_delete: 'Are you sure you want to delete this transaction?',
  credit_confirm_clear_data: 'Are you sure you want to clear all test data?',
  // Savings Accounts
  savings_title: 'Savings Accounts',
  savings_subtitle: 'Manage member savings accounts',
  savings_tab_new: 'New Account',
  savings_tab_list: 'Account List',
  savings_lbl_aadhaar: 'Aadhaar No.',
  savings_lbl_aadhaar_front: 'Aadhaar Front',
  savings_lbl_aadhaar_back: 'Aadhaar Back',
  savings_lbl_pan: 'PAN No.',
  savings_lbl_pan_doc: 'PAN Document',
  savings_lbl_doc_upload: 'Upload Document',
  savings_lbl_account_status: 'Account Status',
  savings_lbl_active: 'Active',
  savings_lbl_inactive: 'Inactive',
  savings_lbl_verify_docs: 'Verify Documents',
  savings_msg_created: 'Account created successfully!',
  savings_msg_updated: 'Account updated successfully!',
  savings_msg_load_error: 'Could not load account list.',
  // Cash/Credit Book
  cashbook_title: 'Credit Book',
  cashbook_subtitle: 'Daily credit book register',
  cashbook_lbl_lf_no: 'LF No.',
  cashbook_lbl_shares: 'Shares',
  cashbook_lbl_purchases: 'Purchases',
  cashbook_lbl_commissions: 'Commissions',
  cashbook_lbl_loan_ac: 'Loan a/c',
  cashbook_lbl_interest: 'Interest',
  cashbook_lbl_pigmi_comm: 'Pigmi Comm.',
  cashbook_lbl_bank_current: 'Bank Current',
  cashbook_lbl_advance: 'Advance',
  cashbook_lbl_lakshmi_pigmi: 'Lakshmi Pigmi Deposit',
  cashbook_lbl_vegetable_comm: 'Vegetable Comm.',
  cashbook_lbl_sundary_ac: 'Sundary a/c',
  cashbook_lbl_cash_sales: 'Cash Sales',
  cashbook_lbl_pesticide_sales: 'Pesticide Sales',
  cashbook_lbl_cold_storage: 'Cold Storage Adv',
  cashbook_lbl_lakshmi_loan: 'Lakshmi Pigmi Loan',
  cashbook_lbl_lakshmi_interest: 'Lakshmi Pigmi Interest',
  // Debit Book
  debitbook_title: 'Debit Book',
  debitbook_subtitle: 'Daily debit book register',
  // General Ledger
  ledger_title: 'General Ledger',
  ledger_subtitle: 'Yearly account summary',
  ledger_lbl_account: 'Account',
  ledger_lbl_month_year: 'Year',
  ledger_lbl_payable: 'Payable',
  ledger_lbl_receivable: 'Receivable',
  ledger_lbl_grand_total: 'Grand Total',
  // Audit Package
  audit_title: 'Audit Package',
  audit_subtitle: 'Complete audit report package',
  audit_lbl_cover_page: 'Cover Page',
  audit_lbl_include_credit: 'Include Credit Book',
  audit_lbl_include_debit: 'Include Debit Book',
  audit_lbl_include_ledger: 'Include General Ledger',
  audit_lbl_include_customers: 'Include Members List',
  audit_lbl_sections: 'Report Sections',
  audit_lbl_date_range: 'Date Range',
  audit_btn_print_all: 'Print Full Audit Package',
  audit_btn_preset_june: 'June 2026',
  // Login
  login_title: 'Belgaum Gardeners Society',
  login_subtitle: 'Accounting Management System',
  login_lbl_username: 'Username',
  login_lbl_password: 'Password',
  login_btn: 'Sign In',
  login_error: 'Invalid username or password',
  // Receipt
  receipt_title: 'Receipt',
  receipt_lbl_cash_memo: 'Cash Memo No.',
  receipt_lbl_received_from: 'Received from',
  receipt_lbl_amount: 'Amount',
  receipt_lbl_amount_words: 'Amount in Words',
  receipt_lbl_on_account_of: 'On Account of',
  receipt_lbl_being: 'Being',
  receipt_lbl_rs: 'Rs.',
  receipt_lbl_ps: 'Ps.',
  receipt_lbl_for_office: 'For Office Use',
  receipt_lbl_authorised_sign: 'Authorised Signatory',
  receipt_lbl_cashier: 'Cashier',
  // Customer Statement
  stmt_title: 'Customer Statement',
  stmt_lbl_account_holder: 'Account Holder',
  stmt_lbl_account_no: 'Account No.',
  stmt_lbl_transactions: 'Transactions',
  stmt_lbl_opening_bal: 'Opening Balance',
  stmt_lbl_closing_bal: 'Closing Balance',
  stmt_lbl_no_transactions: 'No transactions found.',
  // Print
  print_btn: 'Print',
  sidebar_title: 'BGS Accounting',
  sidebar_section_main: 'Main',
  sidebar_section_reports: 'Reports',
  // Misc
  lbl_loading: 'Loading...',
  lbl_no_data: 'No data found.',
  lbl_error: 'Error',
  lbl_success: 'Success',
  lbl_confirm: 'Confirm',
  lbl_yes: 'Yes',
  lbl_no: 'No',
  lbl_rs: 'Rs.',
  lbl_paise: 'Paise',
  lbl_rupees_only: 'Rupees Only',
  lbl_grand_total: 'Grand Total',
  lbl_totals: 'Totals',
};

const mr: Translations = {
  // Navigation
  nav_credit_account: 'पत खाते फॉर्म',
  nav_savings_accounts: 'बचत खाती',
  nav_credit_book: 'जमा वही',
  nav_cash_book: 'रोख वही',
  nav_debit_book: 'नावे वही',
  nav_general_ledger: 'सर्वसाधारण खातेवही',
  nav_audit_package: 'लेखापरीक्षण पॅकेज',
  nav_cashier_dashboard: 'कॅशियर डॅशबोर्ड',
  nav_payment_voucher: '१. रोख पेमेंट व्हाऊचर',
  nav_receipt_voucher: '२. रोख पावती व्हाऊचर',
  nav_rent_bill: '३. भाडे बिल फॉर्म',
  nav_cash_scroll: '४. रोख स्क्रोल पुस्तक',
  nav_cheque_issue: '५. चेक देणे नोंद पुस्तक',
  nav_cashier_audit: '६. कॅशियर लेखापरीक्षा फॉर्म',

  // Header
  header_logout: 'बाहेर पडा',
  header_menu: 'मेनू',
  header_level1: 'स्तर १ · डेटा प्रविष्टी',
  header_level2: 'स्तर २ · दैनंदिन रोख वही',
  header_level3: 'स्तर ३ · सर्वसाधारण खातेवही',
  // Buttons
  btn_save: 'जतन करा',
  btn_reset: 'रीसेट',
  btn_print: 'मुद्रित करा',
  btn_refresh: 'ताजे करा',
  btn_search: 'शोधा',
  btn_add: 'जोडा',
  btn_edit: 'संपादित करा',
  btn_delete: 'हटवा',
  btn_cancel: 'रद्द करा',
  btn_submit: 'सादर करा',
  btn_close: 'बंद करा',
  btn_download: 'डाउनलोड',
  btn_upload: 'अपलोड',
  btn_view: 'पहा',
  btn_new_entry: 'नवीन नोंद',
  btn_load_data: 'डेटा लोड करा',
  btn_generate_report: 'अहवाल तयार करा',
  // Common Form Labels
  lbl_date: 'तारीख',
  lbl_name: 'नाव',
  lbl_amount: 'रक्कम',
  lbl_remarks: 'शेरा',
  lbl_status: 'स्थिती',
  lbl_mobile: 'मोबाईल क्र.',
  lbl_address: 'पत्ता',
  lbl_total: 'एकूण',
  lbl_receipt: 'जमा',
  lbl_debit: 'नावे',
  lbl_credit: 'जमा',
  lbl_balance: 'शिल्लक',
  lbl_particulars: 'तपशील',
  lbl_transaction_type: 'व्यवहाराचा प्रकार',
  lbl_entry_type: 'नोंदीचा प्रकार',
  lbl_from_date: 'सुरुवात तारीख',
  lbl_to_date: 'शेवटची तारीख',
  lbl_search: 'शोधा',
  lbl_filter: 'फिल्टर',
  lbl_actions: 'क्रिया',
  lbl_sr_no: 'अ.क्र.',
  lbl_memo_no: 'रोख मेमो क्र.',
  lbl_customer_id: 'ग्राहक ओळख क्र.',
  lbl_account_no: 'खाते क्र.',
  lbl_salutation: 'संबोधन',
  lbl_first_name: 'पहिले नाव',
  lbl_middle_name: 'मधले नाव',
  lbl_last_name: 'आडनाव',
  lbl_full_name: 'पूर्ण नाव',
  lbl_opening_balance: 'प्रारंभिक शिल्लक',
  lbl_created_by: 'यांनी तयार केले',
  lbl_created_at: 'तयार केल्याची वेळ',
  lbl_month: 'महिना',
  lbl_year: 'वर्ष',
  // Credit Account Form
  credit_form_title: 'पत खाते फॉर्म',
  credit_form_subtitle: 'जमा आणि नावे व्यवहार नोंदवा',
  credit_tab_new: 'नवीन नोंद',
  credit_tab_drafts: 'मसुदे',
  credit_tab_records: 'सर्व नोंदी',
  credit_lbl_cash_memo: 'रोख मेमो क्र.',
  credit_lbl_entry_nature: 'नोंदीचे स्वरूप',
  credit_lbl_cgst: 'केंद्रीय GST',
  credit_lbl_sgst: 'राज्य GST',
  credit_lbl_rs: 'रु.',
  credit_lbl_ps: 'पै.',
  credit_lbl_amount_words: 'रक्कम अक्षरी',
  credit_lbl_add_row: 'ओळ जोडा',
  credit_lbl_particulars_table: 'तपशील',
  credit_lbl_description: 'वर्णन',
  credit_filter_all: 'सर्व',
  credit_filter_credit: 'जमा',
  credit_filter_debit: 'नावे',
  credit_msg_saved: 'व्यवहार यशस्वीरित्या जतन झाला!',
  credit_msg_updated: 'व्यवहार यशस्वीरित्या अद्ययावत झाला!',
  credit_msg_deleted: 'व्यवहार हटवला.',
  credit_msg_draft_saved: 'मसुदा जतन झाला.',
  credit_confirm_delete: 'हा व्यवहार हटवायचा आहे का?',
  credit_confirm_clear_data: 'सर्व चाचणी डेटा साफ करायचा आहे का?',
  // Savings Accounts
  savings_title: 'बचत खाती',
  savings_subtitle: 'सदस्यांची बचत खाती व्यवस्थापित करा',
  savings_tab_new: 'नवीन खाते',
  savings_tab_list: 'खात्यांची यादी',
  savings_lbl_aadhaar: 'आधार क्र.',
  savings_lbl_aadhaar_front: 'आधार (समोरील बाजू)',
  savings_lbl_aadhaar_back: 'आधार (मागील बाजू)',
  savings_lbl_pan: 'पॅन क्र.',
  savings_lbl_pan_doc: 'पॅन कागदपत्र',
  savings_lbl_doc_upload: 'कागदपत्र अपलोड करा',
  savings_lbl_account_status: 'खात्याची स्थिती',
  savings_lbl_active: 'सक्रिय',
  savings_lbl_inactive: 'निष्क्रिय',
  savings_lbl_verify_docs: 'कागदपत्रे पडताळा',
  savings_msg_created: 'खाते यशस्वीरित्या तयार झाले!',
  savings_msg_updated: 'खाते यशस्वीरित्या अद्ययावत झाले!',
  savings_msg_load_error: 'खात्यांची यादी लोड होऊ शकली नाही.',
  // Cash/Credit Book
  cashbook_title: 'जमा वही',
  cashbook_subtitle: 'दैनंदिन जमा वही नोंदणी',
  cashbook_lbl_lf_no: 'LF क्र.',
  cashbook_lbl_shares: 'समभाग',
  cashbook_lbl_purchases: 'खरेदी',
  cashbook_lbl_commissions: 'कमिशन',
  cashbook_lbl_loan_ac: 'कर्ज खाते',
  cashbook_lbl_interest: 'व्याज',
  cashbook_lbl_pigmi_comm: 'पिगमी कमिशन',
  cashbook_lbl_bank_current: 'बँक चालू खाते',
  cashbook_lbl_advance: 'आगाऊ',
  cashbook_lbl_lakshmi_pigmi: 'लक्ष्मी पिगमी ठेव',
  cashbook_lbl_vegetable_comm: 'भाजीपाला कमिशन',
  cashbook_lbl_sundary_ac: 'विविध खाते',
  cashbook_lbl_cash_sales: 'रोख विक्री',
  cashbook_lbl_pesticide_sales: 'कीटकनाशक विक्री',
  cashbook_lbl_cold_storage: 'शीतगृह आगाऊ',
  cashbook_lbl_lakshmi_loan: 'लक्ष्मी पिगमी कर्ज',
  cashbook_lbl_lakshmi_interest: 'लक्ष्मी पिगमी व्याज',
  // Debit Book
  debitbook_title: 'नावे वही',
  debitbook_subtitle: 'दैनंदिन नावे वही नोंदणी',
  // General Ledger
  ledger_title: 'सर्वसाधारण खातेवही',
  ledger_subtitle: 'वार्षिक खाते सारांश',
  ledger_lbl_account: 'खाते',
  ledger_lbl_month_year: 'वर्ष',
  ledger_lbl_payable: 'देणे',
  ledger_lbl_receivable: 'घेणे',
  ledger_lbl_grand_total: 'एकूण बेरीज',
  // Audit Package
  audit_title: 'लेखापरीक्षण पॅकेज',
  audit_subtitle: 'संपूर्ण लेखापरीक्षण अहवाल पॅकेज',
  audit_lbl_cover_page: 'मुखपृष्ठ',
  audit_lbl_include_credit: 'जमा वही समाविष्ट करा',
  audit_lbl_include_debit: 'नावे वही समाविष्ट करा',
  audit_lbl_include_ledger: 'खातेवही समाविष्ट करा',
  audit_lbl_include_customers: 'सदस्यांची यादी समाविष्ट करा',
  audit_lbl_sections: 'अहवालाचे विभाग',
  audit_lbl_date_range: 'तारीख श्रेणी',
  audit_btn_print_all: 'संपूर्ण लेखापरीक्षण पॅकेज मुद्रित करा',
  audit_btn_preset_june: 'जून २०२६',
  // Login
  login_title: 'बेळगाव गार्डनर्स सोसायटी',
  login_subtitle: 'लेखा व्यवस्थापन प्रणाली',
  login_lbl_username: 'वापरकर्तानाव',
  login_lbl_password: 'संकेतशब्द',
  login_btn: 'प्रवेश करा',
  login_error: 'अवैध वापरकर्तानाव किंवा संकेतशब्द',
  // Receipt
  receipt_title: 'पावती',
  receipt_lbl_cash_memo: 'रोख मेमो क्र.',
  receipt_lbl_received_from: 'यांच्याकडून मिळाले',
  receipt_lbl_amount: 'रक्कम',
  receipt_lbl_amount_words: 'रक्कम अक्षरी',
  receipt_lbl_on_account_of: 'खाती',
  receipt_lbl_being: 'विवरण',
  receipt_lbl_rs: 'रु.',
  receipt_lbl_ps: 'पै.',
  receipt_lbl_for_office: 'कार्यालयीन वापरासाठी',
  receipt_lbl_authorised_sign: 'अधिकृत स्वाक्षरी',
  receipt_lbl_cashier: 'रोखपाल',
  // Customer Statement
  stmt_title: 'ग्राहक विवरणपत्र',
  stmt_lbl_account_holder: 'खातेधारक',
  stmt_lbl_account_no: 'खाते क्र.',
  stmt_lbl_transactions: 'व्यवहार',
  stmt_lbl_opening_bal: 'प्रारंभिक शिल्लक',
  stmt_lbl_closing_bal: 'अंतिम शिल्लक',
  stmt_lbl_no_transactions: 'कोणतेही व्यवहार आढळले नाहीत.',
  // Print / Sidebar
  print_btn: 'मुद्रित करा',
  sidebar_title: 'BGS लेखा',
  sidebar_section_main: 'मुख्य',
  sidebar_section_reports: 'अहवाल',
  // Misc
  lbl_loading: 'लोड होत आहे...',
  lbl_no_data: 'कोणताही डेटा आढळला नाही.',
  lbl_error: 'त्रुटी',
  lbl_success: 'यश',
  lbl_confirm: 'पुष्टी करा',
  lbl_yes: 'होय',
  lbl_no: 'नाही',
  lbl_rs: 'रु.',
  lbl_paise: 'पैसे',
  lbl_rupees_only: 'रुपये फक्त',
  lbl_grand_total: 'एकूण बेरीज',
  lbl_totals: 'एकूण',
};

export const translations: Record<Lang, Translations> = { en, mr };

export const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  mr: 'मराठी',
};

export const ITEM_TRANSLATIONS: Record<string, string> = {
  // Rent Items
  "Cold Storage Shop Rent": "शीतगृह दुकान भाडे",
  "Head Office Building Rent": "प्रधान कार्यालय इमारत भाडे",
  "Cold Storage Godown Rent": "शीतगृह गोदाम भाडे",
  "Under Godown Rent": "अंडर गोदाम भाडे",
  "Onion Market Godown Rent": "कांदा मार्केट गोदाम भाडे",
  "New Shop Rent": "नवीन दुकान भाडे",
  "Cold Storage Charges": "शीतगृह शुल्क",

  // Credit & Debit Master Items
  "Pooja Expenses": "पूजा खर्च",
  "Sou Lakshmi Pigmy Deposit Loan": "सौ लक्ष्मी पिग्मी ठेव कर्ज",
  "Sundrey A/C": "सुंदरी खाते (विविध खाते)",
  "Rikshaw charges": "रिक्षा खर्च",
  "PF A/C": "पीएफ खाते",
  "Mobile Recharge": "मोबाईल रिचार्ज",
  "The Pioneer Urban Bank CC": "द पायोनियर अर्बन बँक सीसी (०२०५२२०८३२४९)",
  "CC No": "द पायोनियर अर्बन बँक सीसी (०२०५२२०८३२४९)",
  "ESI A/C": "ईएसआय खाते",
  "Administrative charges": "प्रशासकीय आकार / खर्च",
  "Sou Lakshmi Pigmy Deposit": "सौ लक्ष्मी पिग्मी ठेव",
  "Insurance Fund": "विमा निधी",
  "FD A/C": "मुदत ठेव (FD) खाते",
  "FD Interest": "मुदत ठेव व्याज",
  "Daily Wages": "दैनंदिन मजुरी",
  "Electric Power A/C": "वीज बिल खाते",
  "Advance A/C": "ॲडव्हान्स खाते",
  "The Pioneer Urban Bank CA": "द पायोनियर अर्बन बँक सीए (०२०५२३००७७२०)",
  "CA NO": "द पायोनियर अर्बन बँक सीए (०२०५२३००७७२०)",
  "Printing And Stationary": "मुद्रण व लेखनसामग्री",
  "Seed Section Plastic Bag": "बियाणे विभाग प्लास्टिक पिशव्या",
  "Contigency A/C": "आकस्मिक खर्च खाते",
  "CGST paid (9%)": "सीजीएसटी पेड (९%)",
  "SGST paid (9%)": "एसजीएसटी पेड (९%)",
  "CGST paid (2.5%)": "सीजीएसटी पेड (२.५%)",
  "SGST paid (2.5%)": "एसजीएसटी पेड (२.५%)",
  "GST Feeding fee": "जीएसटी फिडींग फी",
  "Pesticide purchases": "कीटकनाशक खरेदी",
  "Meeting allowance": "सभा भत्ता / खर्च",
  "Legal Fee": "कायदेशीर फी",
  "Sou Lakshmi Pigmy Deposit Interest": "सौ लक्ष्मी पिग्मी ठेव व्याज",
  "Seed purchase": "बियाणे खरेदी",
  "PF and other contribution": "पीएफ व इतर योगदान",
  "ESI and other contribution": "ईएसआय व इतर योगदान",
  "PAY A/C": "पे खाते (वेतन खाते)",
  "Union Bank of India": "युनियन बँक ऑफ इंडिया",
  "TDS A/C": "टीडीएस खाते",
  "Sou Lakshmi Pigmy Deposit commission": "सौ लक्ष्मी पिग्मी ठेव कमिशन",

  // Debit Items
  "Pesticide sales": "कीटकनाशक विक्री",
  "CGST(9%)": "सीजीएसटी (९%)",
  "SGST(9%)": "एसजीएसटी (९%)",
  "CGST received (2.5%)": "सीजीएसटी रिसिव्हड (२.५%)",
  "SGST received (2.5%)": "एसजीएसटी रिसिव्हड (२.५%)",
  "Cold Stove Godawan": "कोल्ड स्टोव्ह गोदाम",
  "Onion Market Godawan": "कांदा मार्केट गोदाम",
  "Under Godawan Rent": "अंडर गोदाम भाडे",
  "Shares A/C": "शेअर्स खाते",
  "Vegetable Commission": "भाजीपाला कमिशन",
};

