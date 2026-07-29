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

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  let url = 'https://gardnersocietybelagavi-production.up.railway.app/api';
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && envUrl.startsWith('http')) {
    url = envUrl.trim();
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const BASE_URL = getApiBaseUrl();

export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

export const getFileUrl = (path?: string | null): string => {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};

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

export const seedJuneTestData = (): Promise<{ inserted: number; skipped: number }> =>
  api.post('/transactions/seed-june-test-data').then(r => r.data);

export const clearJuneTestData = (): Promise<{ deleted: number }> =>
  api.delete('/transactions/clear-june-test-data').then(r => r.data);

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

// ─── Translations ─────────────────────────────────────────────────────────────
const translationCache: Record<string, string> = {};

/**
 * Translate a single text string via cache-first backend endpoint.
 * Fallback to direct call to http://localhost:8001/translate if backend API fails.
 */
export const translateText = async (
  text: string,
  targetLang = 'mar_Deva',
): Promise<{ source_text: string; translated_text: string; from_cache: boolean }> => {
  const trimmed = text ? text.trim() : '';
  if (!trimmed) {
    return { source_text: '', translated_text: '', from_cache: true };
  }
  const cacheKey = `${trimmed}_${targetLang}`;
  if (translationCache[cacheKey]) {
    return { source_text: trimmed, translated_text: translationCache[cacheKey], from_cache: true };
  }

  // Attempt 1: Backend API /api/translations/translate
  try {
    const res = await api.post('/translations/translate', { text: trimmed, target_lang: targetLang });
    if (res.data && res.data.translated_text) {
      translationCache[cacheKey] = res.data.translated_text;
      return res.data;
    }
  } catch {
    // Suppress error and proceed to attempt 2 fallback
  }

  // Attempt 2: Direct call to IndicTrans2 microservice on port 8001
  try {
    const directRes = await axios.post(
      'http://localhost:8001/translate',
      { text: trimmed, target_lang: targetLang },
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    if (directRes.data) {
      const translated =
        typeof directRes.data === 'string'
          ? directRes.data
          : directRes.data.translated_text || directRes.data.translation || directRes.data.output || trimmed;
      translationCache[cacheKey] = translated;
      return { source_text: trimmed, translated_text: translated, from_cache: false };
    }
  } catch {
    // If microservice also unreachable, return original text
  }

  return { source_text: trimmed, translated_text: trimmed, from_cache: false };
};

/**
 * Batch translate multiple texts. Returns a map of { original: translated }.
 */
export const translateBatch = async (
  texts: string[],
  targetLang = 'mar_Deva',
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const t of texts) {
    const trimmed = t ? t.trim() : '';
    if (!trimmed) continue;
    const cacheKey = `${trimmed}_${targetLang}`;
    if (translationCache[cacheKey]) {
      result[trimmed] = translationCache[cacheKey];
    } else {
      missing.push(trimmed);
    }
  }

  if (missing.length === 0) return result;

  try {
    const res = await api.post('/translations/translate-batch', { texts: missing, target_lang: targetLang });
    if (res.data && res.data.translations) {
      Object.assign(result, res.data.translations);
      Object.entries(res.data.translations).forEach(([src, trans]) => {
        translationCache[`${src}_${targetLang}`] = trans as string;
      });
      return result;
    }
  } catch {
    // Fall back to individual translateText calls
  }

  await Promise.all(
    missing.map(m =>
      translateText(m, targetLang).then(r => {
        result[m] = r.translated_text;
      })
    )
  );

  return result;
};


