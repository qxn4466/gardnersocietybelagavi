import axios from 'axios';
import type {
  User,
  OfficeMaster,
  TransactionType,
  Transaction,
  TransactionCreate,
  CashBookRow,
  LedgerRow,
  AccountMaster,
} from '../types';

const BASE_URL = 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

// ─── Auth ───────────────────────────────────────────────────────────────────
export const loginUser = (username: string, password: string): Promise<User> =>
  api.post('/auth/login', { username, password }).then(r => r.data);

// ─── Masters ────────────────────────────────────────────────────────────────
export const fetchOffice = (): Promise<OfficeMaster> =>
  api.get('/masters/office').then(r => r.data);

export const fetchTransactionTypes = (): Promise<TransactionType[]> =>
  api.get('/masters/transaction-types').then(r => r.data);

export const fetchAccounts = (): Promise<AccountMaster[]> =>
  api.get('/masters/accounts').then(r => r.data);

// ─── Transactions ────────────────────────────────────────────────────────────
export const fetchNextMemo = (date?: string): Promise<{ cash_memo_no: string }> =>
  api.get('/transactions/next-memo', { params: { txn_date: date } }).then(r => r.data);

export const createTransaction = (payload: TransactionCreate): Promise<Transaction> =>
  api.post('/transactions/', payload).then(r => r.data);

export const updateTransaction = (id: number, payload: TransactionCreate): Promise<Transaction> =>
  api.put(`/transactions/${id}`, payload).then(r => r.data);

export const fetchDrafts = (): Promise<Transaction[]> =>
  api.get('/transactions/drafts').then(r => r.data);

export const fetchTransactions = (
  startDate?: string,
  endDate?: string,
  transactionTypeId?: number,
  status?: string,
  customerId?: string
): Promise<Transaction[]> =>
  api.get('/transactions/', {
    params: {
      start_date: startDate,
      end_date: endDate,
      transaction_type_id: transactionTypeId,
      status: status,
      customer_id: customerId,
    },
  }).then(r => r.data);

export const fetchTransaction = (id: number): Promise<Transaction> =>
  api.get(`/transactions/${id}`).then(r => r.data);

export const deleteTransaction = (id: number): Promise<void> =>
  api.delete(`/transactions/${id}`).then(r => r.data);

// ─── Cash Book / Credit Book / Debit Book ─────────────────────────────────────
export const fetchCashBook = (startDate?: string, endDate?: string, bookType?: string): Promise<CashBookRow[]> =>
  api.get('/cashbook/', { params: { start_date: startDate, end_date: endDate, book_type: bookType } }).then(r => r.data);

// ─── Ledger ──────────────────────────────────────────────────────────────────
export const fetchLedger = (month?: number, year?: number, account?: string): Promise<LedgerRow[]> =>
  api.get('/ledger/', { params: { month, year, account } }).then(r => r.data);

// ─── Customers / Savings Accounts ─────────────────────────────────────────────
export const fetchNextCustomerId = (): Promise<{ customer_id: string }> =>
  api.get('/customers/next-id').then(r => r.data);

export const fetchCustomers = (query?: string): Promise<import('../types').Customer[]> =>
  api.get('/customers/', { params: { q: query } }).then(r => r.data);

export const fetchCustomer = (id: string): Promise<import('../types').Customer> =>
  api.get(`/customers/${id}`).then(r => r.data);

export const createCustomer = (payload: import('../types').CustomerCreate): Promise<import('../types').Customer> =>
  api.post('/customers/', payload).then(r => r.data);

export const updateCustomer = (id: number, payload: import('../types').CustomerCreate): Promise<import('../types').Customer> =>
  api.put(`/customers/${id}`, payload).then(r => r.data);

export const uploadCustomerDocument = (file: File, docType: string): Promise<{ filename: string; filepath: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  return api.post('/customers/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
