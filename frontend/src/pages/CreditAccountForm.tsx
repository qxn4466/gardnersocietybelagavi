import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Save, RotateCcw, CheckCircle, XCircle,
  Hash, Phone, Building2, CreditCard,
  PlusCircle, Trash2, FileEdit, FolderOpen,
  RefreshCw, Edit3, Filter, Table, List, Printer, User as UserIcon, Sparkles, Languages, Loader2,
  Calendar, BookOpen, FileText, Paperclip, X, Download, Maximize2
} from 'lucide-react';
import Header from '../components/Header';
import ReceiptModal from '../components/ReceiptModal';
import CustomerStatementModal from '../components/CustomerStatementModal';
import SearchableCombobox from '../components/SearchableCombobox';
import {
  fetchOffice,
  fetchTransactionTypes,
  fetchNextMemo,
  fetchNextReference,
  createTransaction,
  updateTransaction,
  fetchTransaction,
  fetchTransactions,
  fetchDrafts,
  deleteTransaction,
  fetchCustomers,
  seedJuneTestData,
  clearJuneTestData,
  translateText,
  createTransactionType,
  uploadTransactionAttachment,
  getFileUrl,
  acquireEditLock,
  releaseEditLock,
} from '../api/client';
import type { OfficeMaster, TransactionType, Transaction, User, Customer } from '../types';
import { RECEIPT_PARTICULARS_OPTIONS, PAYMENT_PARTICULARS_OPTIONS } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useTranslateData } from '../hooks/useTranslateData';

import { getTxnHeadMarathi, translateToMarathi } from '../utils/translator';

// ─── Indian currency → words ─────────────────────────────────────────────────
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')).trim();
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWords(-n);
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (crore)    parts.push(twoDigitWords(crore)    + ' Crore');
  if (lakh)     parts.push(twoDigitWords(lakh)     + ' Lakh');
  if (thousand) parts.push(twoDigitWords(thousand) + ' Thousand');
  if (hundred)  parts.push(ONES[hundred]           + ' Hundred');
  if (remainder) parts.push(twoDigitWords(remainder));
  return parts.join(' ');
}

function amountToWords(total: number): string {
  if (!total || isNaN(total)) return '';
  const rs = Math.floor(total);
  const ps = Math.round((total - rs) * 100);
  const rsWords = rs > 0 ? numberToWords(rs) + ' Rupees' : '';
  const psWords = ps > 0 ? numberToWords(ps) + ' Paise' : '';
  if (rsWords && psWords) return rsWords + ' and ' + psWords + ' Only';
  if (rsWords) return rsWords + ' Only';
  if (psWords) return psWords + ' Only';
  return 'Zero Rupees Only';
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  const resData = (err as { response?: { data?: { detail?: any } } })?.response?.data;
  if (!resData || resData.detail === undefined) {
    return (err as Error)?.message || fallback;
  }
  const detail = resData.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && item.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join('; ');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || JSON.stringify(detail);
  }
  return String(detail);
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ParticularRow {
  id: number;
  description: string;
  amount_rs: string;
  amount_ps: string;
}

interface AttachmentItem {
  id: number;
  name: string;
  path?: string;      // set once uploaded to the server
  file?: File;        // kept so a failed upload can be retried
  status: 'ready' | 'uploading' | 'error';
}

let _rowId = 1;
const newRow = (): ParticularRow => ({ id: _rowId++, description: '', amount_rs: '', amount_ps: '00' });

interface FormState {
  date: string;
  customer_id: string;
  bill_no: string;
  voucher_no: string;
  salutation: string;
  customer_name: string;
  transaction_type_id: string;
  entry_nature: 'CREDIT' | 'DEBIT';
  payment_mode: 'CASH' | 'CHEQUE';
  remarks: string;
  cgst_pct: string;   // CGST percentage, e.g. "2.5" means 2.5%
  sgst_pct: string;   // SGST percentage, e.g. "2.5" means 2.5%
  created_by: string;
}

const INITIAL_FORM: FormState = {
  date: new Date().toISOString().split('T')[0],
  customer_id: '',
  bill_no: '',
  voucher_no: '',
  salutation: 'Mr.',
  customer_name: '',
  transaction_type_id: '',
  entry_nature: 'CREDIT',
  payment_mode: 'CASH',
  remarks: '',
  cgst_pct: '2.5',
  sgst_pct: '2.5',
  created_by: '',
};

const rowAmount = (r: ParticularRow) =>
  parseFloat(r.amount_rs || '0') + parseFloat(r.amount_ps || '0') / 100;

const gridInput: React.CSSProperties = { padding: '7px 10px', fontSize: 13 };

// ─── Attachment Preview Modal ────────────────────────────────────────────────
const AttachmentPreviewModal: React.FC<{
  doc: { path: string; name: string };
  onClose: () => void;
}> = ({ doc, onClose }) => {
  const { lang } = useTranslation();
  const fileUrl = getFileUrl(doc.path);
  const isImage =
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(doc.name) ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(doc.path) ||
    doc.path.startsWith('data:image');

  return (
    <div
      className="no-print"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: 'min(920px, 94vw)', maxHeight: '92vh', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Paperclip size={16} color="#2563eb" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href={fileUrl}
              download={doc.name}
              className="btn btn-secondary btn-sm"
              style={{ color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              title="Download"
            >
              <Download size={14} /> {lang === 'mr' ? 'डाउनलोड' : 'Download'}
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              title={lang === 'mr' ? 'नवीन टॅबमध्ये उघडा' : 'Open in new tab'}
            >
              <Maximize2 size={14} /> {lang === 'mr' ? 'नवीन टॅब' : 'New Tab'}
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <X size={14} /> {lang === 'mr' ? 'बंद करा' : 'Close'}
            </button>
          </div>
        </div>

        {/* Body — images render inline; PDFs, text and other types in an embedded viewer */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 14 }}>
          {isImage ? (
            <img
              src={fileUrl}
              alt={doc.name}
              style={{ maxWidth: '100%', maxHeight: 'calc(92vh - 130px)', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.12)', background: '#fff' }}
            />
          ) : (
            <iframe
              src={fileUrl}
              title={doc.name}
              style={{ width: '100%', height: 'calc(92vh - 150px)', border: 'none', borderRadius: 8, background: '#fff' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface CreditAccountFormProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
const CreditAccountForm: React.FC<CreditAccountFormProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { t, lang } = useTranslation();
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [txnTypes, setTxnTypes] = useState<TransactionType[]>([]);
  const [nextMemo, setNextMemo] = useState<string>('—');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [rows, setRows] = useState<ParticularRow[]>([newRow()]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ path: string; name: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const submissionFeedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alert?.type === 'error') {
      requestAnimationFrame(() => submissionFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  }, [alert]);

  const [viewMode, setViewMode] = useState<'vertical' | 'excel'>(() => {
    return (localStorage.getItem('bgs_credit_form_view_mode') as 'vertical' | 'excel') || 'vertical';
  });

  const handleViewModeChange = (mode: 'vertical' | 'excel') => {
    setViewMode(mode);
    localStorage.setItem('bgs_credit_form_view_mode', mode);
  };

  const [searchViewMode, setSearchViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_credit_search_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleSearchViewModeChange = (mode: 'excel' | 'vertical') => {
    setSearchViewMode(mode);
    localStorage.setItem('bgs_credit_search_view_mode', mode);
  };

  const [translatingForm, setTranslatingForm] = useState(false);

  const translateFormToMarathi = async () => {
    setTranslatingForm(true);
    setAlert({
      type: 'info',
      msg: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      let updatedCount = 0;

      // 1. Translate Customer Name, Accountant Name & Remarks
      const formUpdates: Partial<FormState> = {};
      for (const field of ['customer_name', 'created_by', 'remarks'] as const) {
        const val = form[field] ? String(form[field]).trim() : '';
        if (val) {
          const tr = await translateToMarathi(val);
          if (tr && tr !== val) {
            formUpdates[field] = tr;
            updatedCount++;
          }
        }
      }
      if (Object.keys(formUpdates).length > 0) {
        setForm(prev => ({ ...prev, ...formUpdates }));
      }

      // 2. Translate Particulars Rows Descriptions
      const updatedRows = [...rows];
      for (let i = 0; i < updatedRows.length; i++) {
        const desc = updatedRows[i].description ? updatedRows[i].description.trim() : '';
        if (desc) {
          const tr = await translateToMarathi(desc);
          if (tr && tr !== desc) {
            updatedRows[i] = { ...updatedRows[i], description: tr };
            updatedCount++;
          }
        }
      }
      if (updatedCount > 0) {
        setRows(updatedRows);
        setAlert({ type: 'success', msg: lang === 'mr' ? 'मराठीत यशस्वीरित्या रूपांतरित झाले!' : 'Form translated to Marathi successfully!' });
      } else {
        setAlert({ type: 'success', msg: lang === 'mr' ? 'मराठीत रूपांतरित झाले आहे.' : 'Form translated to Marathi.' });
      }
    } catch {
      setAlert({ type: 'error', msg: lang === 'mr' ? 'भाषांतर करताना अडचण आली.' : 'Translation failed.' });
    } finally {
      setTranslatingForm(false);
    }
  };
  const [savedMemo, setSavedMemo] = useState<string | null>(null);
  const [lastSavedTxn, setLastSavedTxn] = useState<Transaction | null>(null);
  const [printingTxn, setPrintingTxn] = useState<Transaction | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Draft / Edit states
  const [drafts, setDrafts] = useState<Transaction[]>([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [expandedParticularsId, setExpandedParticularsId] = useState<number | null>(null);

  // History Filter states
  const [hStartDate, setHStartDate] = useState(todayStr);
  const [hEndDate, setHEndDate] = useState(todayStr);
  const [hTxnTypeId, setHTxnTypeId] = useState('');
  const [hCustomerId, setHCustomerId] = useState('');
  const [hStatus, setHStatus] = useState('');
  const [hNature, setHNature] = useState('');
  const [historyList, setHistoryList] = useState<Transaction[]>([]);
  const [hLoading, setHLoading] = useState(false);

  const loadDrafts = useCallback(() => {
    fetchDrafts().then(setDrafts).catch(() => {});
  }, []);

  const loadHistory = useCallback(async () => {
    setHLoading(true);
    try {
      const data = await fetchTransactions(
        hStartDate,
        hEndDate,
        hTxnTypeId ? parseInt(hTxnTypeId) : undefined,
        hStatus || undefined,
        hCustomerId || undefined
      );
      setHistoryList(data);
    } catch {
      // ignore history error silently
    } finally {
      setHLoading(false);
    }
  }, [hStartDate, hEndDate, hTxnTypeId, hStatus, hCustomerId]);

  const [customerList, setCustomerList] = useState<Customer[]>([]);

  // ── Auto-save draft in localStorage for CreditAccountForm ──
  const CREDIT_DRAFT_KEY = 'bgs_credit_form_draft';

  useEffect(() => {
    if (form.customer_name.trim() || rows.some(r => r.description.trim() !== '')) {
      localStorage.setItem(CREDIT_DRAFT_KEY, JSON.stringify({ form, rows, editingDraftId }));
    }
  }, [form, rows, editingDraftId]);

  useEffect(() => {
    const saved = localStorage.getItem(CREDIT_DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.form && parsed.rows && parsed.rows.length > 0) {
          setForm(parsed.form);
          setRows(parsed.rows);
          if (parsed.editingDraftId) setEditingDraftId(parsed.editingDraftId);
          setAlert({ type: 'success', msg: '💾 In-progress transaction form draft auto-restored!' });
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Check URL search params for ?edit=ID or ?customer_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    const custId = params.get('customer_id');
    const custName = params.get('customer_name');

    if (editId) {
      fetchTransaction(parseInt(editId))
        .then(t => {
          void openForEdit(t);
        })
        .catch(() => setAlert({ type: 'error', msg: 'Failed to load transaction for editing.' }));
    } else if (custId || custName) {
      if (custId) setForm(prev => ({ ...prev, customer_id: custId }));
      if (custName) {
        const decodedName = decodeURIComponent(custName);
        setForm(prev => ({ ...prev, customer_name: decodedName }));
      }
    }
  }, []);

  useEffect(() => {
    fetchOffice()
      .then(setOffice)
      .catch((err) => {
        if (!err?.response) {
          setAlert({ type: 'error', msg: 'Backend not reachable. Start the FastAPI server.' });
        }
      });
    fetchTransactionTypes().then(setTxnTypes);
    fetchCustomers().then(setCustomerList).catch(() => {});
    loadDrafts();
    loadHistory();
  }, [loadDrafts, loadHistory]);

  const refreshMemo = useCallback((d: string) => {
    fetchNextMemo(d).then(r => setNextMemo(r.cash_memo_no)).catch(() => setNextMemo('BGS-AUTO'));
  }, []);

  useEffect(() => { refreshMemo(form.date); }, [form.date, refreshMemo]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      setAlert(null);
    };

  const generateReference = async () => {
    try {
      const { reference_no } = await fetchNextReference(form.date, form.entry_nature);
      setForm(prev => form.entry_nature === 'CREDIT'
        ? { ...prev, bill_no: reference_no }
        : { ...prev, voucher_no: reference_no }
      );
      setAlert({ type: 'success', msg: `${form.entry_nature === 'CREDIT' ? 'Bill' : 'Voucher'} number ${reference_no} generated.` });
    } catch {
      setAlert({ type: 'error', msg: 'Could not generate the reference number. Check backend connection.' });
    }
  };

  // ── Attachments (for both CREDIT & DEBIT entries) — uploaded at selection time ──
  const handleAddFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const stamp = Date.now();
    setAttachments(prev => [
      ...prev,
      ...files.map((f, i) => ({ id: stamp + i, name: f.name, file: f, status: 'uploading' as const })),
    ]);
    for (let i = 0; i < files.length; i++) {
      const itemId = stamp + i;
      try {
        const res = await uploadTransactionAttachment(files[i]);
        setAttachments(prev => prev.map(a => (a.id === itemId ? { ...a, path: res.filepath, status: 'ready' } : a)));
      } catch {
        setAttachments(prev => prev.map(a => (a.id === itemId ? { ...a, status: 'error' } : a)));
      }
    }
  };
  const removeAttachment = (id: number) => setAttachments(prev => prev.filter(a => a.id !== id));
  const retryAttachment = async (id: number) => {
    const item = attachments.find(a => a.id === id);
    if (!item || !item.file) return;
    setAttachments(prev => prev.map(a => (a.id === id ? { ...a, status: 'uploading' } : a)));
    try {
      const res = await uploadTransactionAttachment(item.file);
      setAttachments(prev => prev.map(a => (a.id === id ? { ...a, path: res.filepath, status: 'ready' } : a)));
    } catch {
      setAttachments(prev => prev.map(a => (a.id === id ? { ...a, status: 'error' } : a)));
    }
  };

  // ── Add New Transaction Type / Account Head (saved to DB + dropdown refreshed) ──
  const handleAddNewAccountHead = async (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    try {
      await createTransactionType({ name: trimmed, entry_type: form.entry_nature || 'BOTH' });
      const refreshed = await fetchTransactionTypes();
      setTxnTypes(refreshed);
      const created = refreshed.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
      if (created) {
        setForm(prev => ({ ...prev, transaction_type_id: String(created.id) }));
      }
      setAlert({
        type: 'success',
        msg: lang === 'mr'
          ? `नवीन खाते शीर्ष "${trimmed}" जोडले गेले व ड्रॉपडाउनमध्ये दिसू लागले.`
          : `New account head "${trimmed}" saved and refreshed in the dropdown.`,
      });
    } catch {
      setAlert({
        type: 'error',
        msg: lang === 'mr' ? 'नवीन खाते शीर्ष जोडताना त्रुटी आली.' : 'Failed to add the new account head.',
      });
    }
  };

  // ── Particulars grid ────────────────────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id: number) =>
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  const updateRow = (id: number, field: keyof Omit<ParticularRow, 'id'>, value: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  // ── Computed totals for entry form ──────────────────────────────────────────
  const particularsTotal = rows.reduce((s, r) => s + rowAmount(r), 0);
  const cgstPct  = parseFloat(form.cgst_pct  || '0');   // e.g. 2.5 → 2.5%
  const sgstPct  = parseFloat(form.sgst_pct  || '0');
  const cgstAmt  = (particularsTotal * cgstPct) / 100;   // computed tax amount
  const sgstAmt  = (particularsTotal * sgstPct) / 100;
  const grandTotal = particularsTotal + cgstAmt + sgstAmt;
  const grandRs = Math.floor(grandTotal);
  const grandPs = Math.round((grandTotal - grandRs) * 100);
  const amountInWords = amountToWords(grandTotal);

  // ── History total amount & nature calculations ──────────────────────────────
  const displayedHistoryList = historyList.filter(t => {
    if (!hNature) return true;
    const nature = t.entry_nature || t.transaction_type?.entry_type || 'CREDIT';
    return nature === hNature;
  });

  const historyCreditTotal = displayedHistoryList
    .filter(t => (t.entry_nature || t.transaction_type?.entry_type || 'CREDIT') === 'CREDIT')
    .reduce((sum, t) => sum + Number(t.amount_rs) + Number(t.amount_ps) / 100, 0);

  const historyDebitTotal = displayedHistoryList
    .filter(t => (t.entry_nature || t.transaction_type?.entry_type) === 'DEBIT')
    .reduce((sum, t) => sum + Number(t.amount_rs) + Number(t.amount_ps) / 100, 0);

  const historyTotalAmount = displayedHistoryList.reduce(
    (sum, t) => sum + Number(t.amount_rs) + Number(t.amount_ps) / 100,
    0
  );

  // ── Save function (Draft vs Post) ────────────────────────────────────────────
  const handleSave = async (isDraft: boolean) => {
    const custIdTrimmed = form.customer_id.trim();

    if (isDraft) {
      if (custIdTrimmed && !/^\d{10}$/.test(custIdTrimmed)) {
        setAlert({
          type: 'error',
          msg: lang === 'mr'
            ? 'ग्राहक ओळख क्र. / खाते क्रमांक १० अंकी असणे आवश्यक आहे (उदा. 1000000001).'
            : 'Customer ID / Account No. must be a 10-digit numeric ID (e.g. 1000000001).'
        });
        return;
      }
    } else {
      if (custIdTrimmed && !/^\d{10}$/.test(custIdTrimmed)) {
        setAlert({
          type: 'error',
          msg: lang === 'mr'
            ? 'ग्राहक ओळख क्र. / खाते क्रमांक १० अंकी असणे आवश्यक आहे (उदा. 1000000001).'
            : 'Customer ID / Account No. must be a 10-digit numeric ID (e.g. 1000000001).'
        });
        return;
      }
      if (!form.transaction_type_id) {
        setAlert({
          type: 'error',
          msg: lang === 'mr' ? 'कृपया व्यवहाराचा प्रकार निवडा.' : 'Please select a transaction type.'
        });
        return;
      }
      const hasItems = rows.some(r => r.description.trim() || parseFloat(r.amount_rs || '0') > 0);
      if (!hasItems || grandTotal <= 0) {
        setAlert({
          type: 'error',
          msg: lang === 'mr' ? 'कृपया किमान एक तपशील व रक्कम जोडा.' : 'Please add at least one particular with an amount.'
        });
        return;
      }
    }

    const particularsText = rows
      .filter(r => r.description.trim())
      .map(r => `${r.description}: Rs.${parseFloat(r.amount_rs || '0').toFixed(0)}.${r.amount_ps || '00'}`)
      .join(' | ');

    const taxNote = [
      cgstPct > 0 ? `CGST (${cgstPct}%): Rs.${cgstAmt.toFixed(2)}` : '',
      sgstPct > 0 ? `SGST (${sgstPct}%): Rs.${sgstAmt.toFixed(2)}` : '',
    ].filter(Boolean).join(', ');

    setLoading(true);
    try {
      // Attachments upload at selection time — block save until every chip is ready
      if (attachments.some(a => a.status !== 'ready')) {
        setAlert({
          type: 'error',
          msg: lang === 'mr'
            ? 'एखादा दस्तऐवज अजून अपलोड होत आहे किंवा अपलोड अयशस्वी झाला आहे — तो काढा किंवा ↻ दाबून पुन्हा प्रयत्न करा.'
            : 'An attachment is still uploading or has failed — remove it or press ↻ to retry.'
        });
        setLoading(false);
        return;
      }
      const uploadedAttachments = attachments.map(a => ({ path: a.path as string, name: a.name }));

      let parsedTypeId = parseInt(form.transaction_type_id || '1');
      if (isNaN(parsedTypeId) || !parsedTypeId) {
        const matched = txnTypes.find(t => t.name.toLowerCase() === form.transaction_type_id.trim().toLowerCase());
        parsedTypeId = matched ? matched.id : (txnTypes[0]?.id || 1);
      }

      const payload = {
        date: form.date,
        customer_id: custIdTrimmed || undefined,
        bill_no: form.entry_nature === 'CREDIT' ? form.bill_no.trim() || undefined : undefined,
        voucher_no: form.entry_nature === 'DEBIT' ? form.voucher_no.trim() || undefined : undefined,
        customer_name: form.customer_name.trim()
          ? (form.customer_name.startsWith(form.salutation) ? form.customer_name : `${form.salutation} ${form.customer_name}`)
          : (lang === 'mr' ? 'सामान्य खाते' : 'General Account'),
        particulars: [particularsText, taxNote].filter(Boolean).join(' — '),
        transaction_type_id: parsedTypeId,
        entry_nature: form.entry_nature,
        payment_mode: form.payment_mode,
        attachments: uploadedAttachments.length ? JSON.stringify(uploadedAttachments) : undefined,
        amount_rs: grandRs,
        amount_ps: grandPs,
        remarks: form.remarks,
        created_by: form.created_by,
        status: isDraft ? 'DRAFT' : 'POSTED',
      };

      let saved: Transaction;
      if (editingDraftId) {
        saved = await updateTransaction(editingDraftId, payload);
        if (isDraft) {
          void acquireEditLock('transaction', editingDraftId, user?.username || 'unknown').catch(() => {});
        } else {
          void releaseEditLock('transaction', editingDraftId, user?.username || 'unknown').catch(() => {});
        }
      } else {
        saved = await createTransaction(payload);
      }

      setSavedMemo(saved.cash_memo_no);
      setLastSavedTxn(saved);
      loadDrafts();
      if (saved.date && saved.date < hStartDate) setHStartDate(saved.date);
      if (saved.date && saved.date > hEndDate) setHEndDate(saved.date);
      loadHistory();

      if (isDraft) {
        setAlert({
          type: 'success',
          msg: lang === 'mr'
            ? `मसुदा यशस्वीरित्या जतन केला! (कॅश मेमो: ${saved.cash_memo_no})`
            : `Draft saved successfully! (Memo: ${saved.cash_memo_no})`
        });
        setEditingDraftId(saved.id);
      } else {
        localStorage.removeItem('bgs_credit_form_draft');
        setSavedMemo(saved.cash_memo_no);
        setLastSavedTxn(saved);
        setAlert({
          type: 'success',
          msg: lang === 'mr'
            ? `व्यवहार यशस्वीरित्या जतन आणि पोस्ट केला! (कॅश मेमो: ${saved.cash_memo_no})`
            : `Transaction posted successfully! Cash Memo: ${saved.cash_memo_no}`
        });
        handleReset(false);
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        lang === 'mr' ? 'जतन करताना त्रुटी आली. बॅकएंड कनेक्शन तपासा.' : 'Save failed. Check backend connection.'
      );
      setAlert({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (clearAlertAndMemo: boolean = true) => {
    if (editingDraftId) {
      void releaseEditLock('transaction', editingDraftId, user?.username || 'unknown').catch(() => {});
    }
    localStorage.removeItem('bgs_credit_form_draft');
    setForm(INITIAL_FORM);
    setRows([newRow()]);
    setAttachments([]);
    if (clearAlertAndMemo === true) {
      setAlert(null);
      setSavedMemo(null);
    }
    setEditingDraftId(null);
    refreshMemo(INITIAL_FORM.date);
  };

  // ── One member edits a record at a time (edit lease) ────────────────────────
  const openForEdit = async (d: Transaction) => {
    if (d.id) {
      try {
        const res = await acquireEditLock('transaction', d.id, user?.username || 'unknown');
        if (res.locked) {
          setAlert({
            type: 'error',
            msg: lang === 'mr'
              ? `ही नोंद सध्या ${res.locked_by} संपादनात आहे — ${Math.ceil((res.seconds_remaining || 0) / 60)} मिनिटांत पुन्हा प्रयत्न करा.`
              : `This record is currently being edited by ${res.locked_by} — try again in ${Math.ceil((res.seconds_remaining || 0) / 60)} min.`,
          });
          return;
        }
      } catch {
        // lock service unavailable — allow editing
      }
    }
    loadDraftIntoForm(d);
  };

  // ── Load draft/transaction into form for editing ─────────────────────────────
  const loadDraftIntoForm = (d: Transaction) => {
    const salutationMatches = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Sri.', 'Smt.'];
    let sal = 'Mr.';
    let custName = d.customer_name;
    for (const s of salutationMatches) {
      if (d.customer_name.startsWith(s + ' ')) {
        sal = s;
        custName = d.customer_name.substring(s.length + 1);
        break;
      }
    }

    setForm({
      date: d.date,
      customer_id: d.customer_id || '',
      bill_no: d.bill_no || '',
      voucher_no: d.voucher_no || '',
      salutation: sal,
      customer_name: custName,
      transaction_type_id: String(d.transaction_type_id),
      entry_nature: (d.entry_nature as 'CREDIT' | 'DEBIT') || 'CREDIT',
      payment_mode: (d.payment_mode as 'CASH' | 'CHEQUE') || 'CASH',
      remarks: d.remarks || '',
      cgst_pct: '2.5',
      sgst_pct: '2.5',
      created_by: d.created_by || '',
    });

    try {
      const parsedAtt = d.attachments ? JSON.parse(d.attachments) : [];
      setAttachments(
        Array.isArray(parsedAtt)
          ? parsedAtt
              .filter((a: { path?: string }) => a && a.path)
              .map((a: { path: string; name?: string }, i: number) => ({
                id: Date.now() + i,
                path: a.path,
                name: a.name || a.path.split('/').pop() || 'Attachment',
                status: 'ready' as const,
              }))
          : []
      );
    } catch {
      setAttachments([]);
    }

    if (d.particulars) {
      const parts = d.particulars.split(' — ')[0].split(' | ');
      const newParticularRows: ParticularRow[] = parts.map((pStr) => {
        const colonIdx = pStr.indexOf(': Rs.');
        if (colonIdx !== -1) {
          const desc = pStr.substring(0, colonIdx).trim();
          const amtStr = pStr.substring(colonIdx + 5).trim();
          const [rsStr, psStr] = amtStr.split('.');
          return { id: _rowId++, description: desc, amount_rs: rsStr || '0', amount_ps: psStr || '00' };
        }
        return { id: _rowId++, description: pStr, amount_rs: String(d.amount_rs), amount_ps: String(d.amount_ps) };
      });
      setRows(newParticularRows.length ? newParticularRows : [newRow()]);
    } else {
      setRows([{ id: _rowId++, description: '', amount_rs: String(d.amount_rs), amount_ps: String(d.amount_ps) }]);
    }

    setEditingDraftId(d.id);
    setSavedMemo(d.cash_memo_no);
    setShowDraftsModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ type: 'success', msg: `Loaded transaction ${d.cash_memo_no} into form.` });
  };

  // ── Delete transaction ───────────────────────────────────────────────────────
  const handleDeleteTransaction = async (id: number, memoNo: string) => {
    if (!window.confirm(`Are you sure you want to delete transaction ${memoNo}?`)) return;
    try {
      await deleteTransaction(id);
      loadDrafts();
      loadHistory();
      if (editingDraftId === id) handleReset();
    } catch {
      setAlert({ type: 'error', msg: 'Failed to delete transaction.' });
    }
  };

  const handleSeedJuneData = async () => {
    setLoading(true);
    try {
      const res = await seedJuneTestData();
      setAlert({
        type: 'success',
        msg: `Successfully added 2026 test dataset! (${res.inserted} inserted, ${res.skipped} skipped)`,
      });
      loadHistory();
      refreshMemo(form.date);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to seed 2026 test data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearJuneData = async () => {
    if (!window.confirm('Are you sure you want to delete all June 2026 test transaction records?')) return;
    setLoading(true);
    try {
      const res = await clearJuneTestData();
      setAlert({
        type: 'success',
        msg: `Successfully deleted ${res.deleted} June 2026 test transaction records!`,
      });
      loadHistory();
      refreshMemo(form.date);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to clear June test data.' });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const colGrid = '1fr 140px 100px 40px';

  const AttachmentPicker = () => (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Paperclip size={13} />
        {lang === 'mr' ? 'सोबतचे दस्तऐवज (जमा व नावे दोन्ही नोंदीसाठी)' : 'Attachments (for both Credit & Debit entries)'}
      </label>
      <input
        type="file"
        multiple
        className="form-input"
        style={{ maxWidth: 520 }}
        onChange={e => { handleAddFiles(e.target.files); e.target.value = ''; }}
      />
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {attachments.map(a => (
            <span
              key={a.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 14, padding: '3px 10px', fontSize: 12,
                background: a.status === 'error' ? '#fee2e2' : a.status === 'uploading' ? '#f1f5f9' : '#eff6ff',
                border: a.status === 'error' ? '1px solid #fca5a5' : a.status === 'uploading' ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
              }}
            >
              {a.status === 'ready' && a.path ? (
                <button
                  type="button"
                  onClick={() => setPreviewDoc({ path: a.path as string, name: a.name })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 600, padding: 0, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  title={lang === 'mr' ? 'प्रीव्ह्यू पहा' : 'Show preview'}
                >
                  ✓ {a.name}
                </button>
              ) : (
                <span style={{ color: a.status === 'error' ? '#b91c1c' : '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {a.status === 'uploading' && <Loader2 size={12} className="spinner" />}
                  {a.status === 'uploading' ? (lang === 'mr' ? 'अपलोड होत आहे…' : 'Uploading…') : (lang === 'mr' ? 'अपलोड अयशस्वी' : 'Upload failed')}
                  {' · '}{a.name}
                </span>
              )}
              {a.status === 'error' && a.file && (
                <button
                  type="button"
                  title={lang === 'mr' ? 'पुन्हा प्रयत्न करा' : 'Retry upload'}
                  onClick={() => retryAttachment(a.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', padding: 0, display: 'flex', fontWeight: 800, fontSize: 13 }}
                >
                  ↻
                </button>
              )}
              <button
                type="button"
                title={lang === 'mr' ? 'काढा' : 'Remove'}
                onClick={() => removeAttachment(a.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, display: 'flex' }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, display: 'block' }}>
        {lang === 'mr'
          ? 'बिल / पावती / दस्तऐवजाचे स्कॅन जोडा (एकापेक्षा अधिक फाईल निवडू शकता).'
          : 'Attach bill / voucher / receipt scans (multiple files allowed).'}
      </span>
    </div>
  );

  const ColHeader = ({ label, align = 'left' }: { label: string; align?: 'left' | 'right' | 'center' }) => (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--blue-700)', textAlign: align,
    }}>{label}</span>
  );

  return (
    <div className="page-container">
      <Header
        title={t('credit_form_title')}
        subtitle={lang === 'mr'
          ? 'बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि.'
          : 'Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.'}
        level={1}
        showPrint={true}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">

        {/* ── 2026 Test Dataset Toolbar ── */}
        <div className="no-print" style={{
          marginBottom: 16, padding: '12px 18px', background: '#f8fafc',
          borderRadius: 10, border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-700)' }}>
              {lang === 'mr' ? '🧪 २०२६ चाचणी डेटा संच टूलबार (जानेवारी–जुलै)' : '🧪 2026 Test Dataset Toolbar (Jan–July)'}
            </span>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {lang === 'mr' ? 'जानेवारी ते जुलै २०२६ दरम्यानच्या सर्व जमा आणि नावे खात्यांच्या चाचणी नोंदी जोडा किंवा साफ करा' : 'Add or clear test transactions from Jan to July 2026 covering all Credit & Debit heads'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSeedJuneData}
              disabled={loading}
              style={{ background: 'var(--blue-700)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <PlusCircle size={14} /> {lang === 'mr' ? '२०२६ चाचणी नोंदी जोडा (जाने-जुलै)' : 'Add 2026 Test Records (Jan–July)'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearJuneData}
              disabled={loading}
              style={{ borderColor: 'var(--red-600)', color: 'var(--red-600)', background: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={14} /> {lang === 'mr' ? '🗑️ २०२६ चाचणी नोंदी हटवा' : '🗑️ Delete 2026 Test Records'}
            </button>
          </div>
        </div>

        {/* ── Static Banner ── */}
        <div className="static-banner">
          <div className="org-title">
            {lang === 'mr'
              ? <>बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि.<br /><span style={{ fontSize: 13, fontWeight: 500 }}>९३०/१-अ, झेंडा चौक मार्केट, बेळगाव ५९०००२</span></>
              : <>Belgaum Gardeners Co-op Production Supply and Sale Society Ltd.<br /><span style={{ fontSize: 13, fontWeight: 500 }}>930/1A Zanda Chowk Market, Belgaum 590002</span></>}
          </div>
          <div className="static-grid">
            <div className="static-field">
              <label><Hash size={10} style={{ display: 'inline' }} /> {lang === 'mr' ? 'GST क्रमांक' : 'GST Number'}</label>
              <span>{office?.gst_no ?? '—'}</span>
            </div>
            <div className="static-field">
              <label><CreditCard size={10} style={{ display: 'inline' }} /> {t('lbl_memo_no')}</label>
              <div className="memo-badge" style={{ marginTop: 2 }}>
                <Hash size={12} /> {nextMemo}
              </div>
            </div>
            <div className="static-field">
              <label><Phone size={10} style={{ display: 'inline' }} /> {lang === 'mr' ? 'दूरध्वनी क्रमांक' : 'Phone Numbers'}</label>
              <span>{office?.phone1 ?? '—'}{office?.phone2 ? ` / ${office.phone2}` : ''}</span>
            </div>
            <div className="static-field">
              <label><Building2 size={10} style={{ display: 'inline' }} /> {lang === 'mr' ? 'कार्यालयाचा पत्ता' : 'Office Address'}</label>
              <span>{office?.address ?? (lang === 'mr' ? 'बेळगाव, कर्नाटक - 590001' : 'Belgaum, Karnataka - 590001')}</span>
            </div>
          </div>
        </div>

        {/* ── Bill Form Card ── */}
        <div className="card" style={{ marginBottom: 32, borderTop: '4px solid #1d4ed8', boxShadow: '0 4px 16px rgba(29, 78, 216, 0.09)' }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {lang === 'mr' ? 'व्यवहार नोंद' : 'Transaction Entry'}
                {editingDraftId && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px',
                    background: '#fef3c7', color: '#b45309',
                    border: '1px solid #fde68a', borderRadius: 12,
                  }}>
                    {lang === 'mr' ? 'संपादन #' : 'Editing #'}{editingDraftId}
                  </span>
                )}
              </div>
              <div className="card-subtitle">{lang === 'mr' ? '* चिन्हांकित सर्व रकाने अनिवार्य आहेत' : 'All fields marked with * are required'}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* View Mode Switcher */}
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('vertical')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'vertical' ? '#2563eb' : 'transparent',
                    color: viewMode === 'vertical' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  id="credit-vertical-view-btn"
                >
                  <List size={14} /> {lang === 'mr' ? 'उभी मांडणी (एकखाली एक)' : 'Vertical Stack View'}
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('excel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'excel' ? '#059669' : 'transparent',
                    color: viewMode === 'excel' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  id="credit-excel-grid-view-btn"
                >
                  <Table size={14} /> {lang === 'mr' ? 'एक्सेल ग्रिड मांडणी' : 'Excel Grid View'}
                </button>
              </div>

              <button
                type="button"
                onClick={translateFormToMarathi}
                disabled={translatingForm}
                style={{
                  background: translatingForm ? '#cbd5e1' : '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: translatingForm ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {translatingForm ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    {lang === 'mr' ? 'मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : 'Translating to Marathi, please wait...'}
                  </>
                ) : (
                  <>
                    <Languages size={14} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDraftsModal(true)}
                id="view-drafts-btn"
              >
                <FolderOpen size={14} /> {lang === 'mr' ? `जतन केलेले मसुदे (${drafts.length})` : `Saved Drafts (${drafts.length})`}
              </button>

              {savedMemo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="memo-badge">
                  <CheckCircle size={13} /> {lang === 'mr' ? 'शेवटचे जतन:' : 'Last saved:'} {savedMemo}
                </div>
                  {lastSavedTxn && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setPrintingTxn(lastSavedTxn)}
                      id="print-last-saved-btn"
                    >
                      <Printer size={14} /> {lang === 'mr' ? 'पावती मुद्रित करा' : 'Print Bill Receipt'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} id="credit-form">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* MODE 1: VERTICAL STACK VIEW (BALANCED 2-COLUMN ALIGNMENT)     */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {viewMode === 'vertical' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '20px 28px',
                  marginBottom: 20,
                  width: '100%',
                }}>

                  {/* ── Left Column: Date, Customer ID, Customer Name ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 1. Date */}
                    <div className="form-group">
                      <label className="form-label">{t('lbl_date')} <span className="required">*</span></label>
                      <input id="txn-date" type="date" className="form-input"
                        value={form.date} onChange={handleChange('date')} required style={{ width: '100%' }} />
                    </div>

                    {/* 2. Customer ID */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">{lang === 'mr' ? '१०-अंकी ग्राहक ओळख क्र. / खाते क्र. (पर्यायी)' : '10-Digit Customer ID / Account No. (Optional)'}</label>
                        {form.customer_id.trim().length > 0 && form.customer_id.trim().length !== 10 && (
                          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
                            {lang === 'mr' ? `(${form.customer_id.trim().length}/१० अंक)` : `(${form.customer_id.trim().length}/10 digits)`}
                          </span>
                        )}
                      </div>
                      <input
                        id="customer-id"
                        type="text"
                        maxLength={10}
                        list="saved-customers-list"
                        className="form-input"
                        placeholder={lang === 'mr' ? '१०-अंकी ओळख क्र. (e.g. 1000000001)' : 'Enter 10-Digit ID (e.g. 1000000001)'}
                        value={form.customer_id}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setForm(prev => ({ ...prev, customer_id: val }));
                          const match = customerList.find(c => c.customer_id === val || c.full_name === val);
                          if (match) {
                            setForm(prev => ({
                              ...prev,
                              customer_id: match.customer_id,
                              salutation: match.salutation || 'Mr.',
                              customer_name: `${match.first_name}${match.middle_name ? ' ' + match.middle_name : ''} ${match.last_name}`.trim(),
                            }));
                            setAlert({ type: 'success', msg: `${lang === 'mr' ? 'ग्राहक आत्मचलित:' : 'Auto-filled customer:'} ${match.full_name}` });
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                      <datalist id="saved-customers-list">
                        {customerList.map(c => (
                          <option key={c.id} value={c.customer_id}>
                            {c.full_name} ({c.mobile_no || (lang === 'mr' ? 'मोबाइल नाही' : 'No Mobile')})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {form.entry_nature === 'CREDIT'
                          ? (lang === 'mr' ? 'बिल क्रमांक (B.No.)' : 'Bill Number (B.No.)')
                          : (lang === 'mr' ? 'व्हाऊचर क्रमांक (V.No.)' : 'Voucher Number (V.No.)')}
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          id="entry-reference"
                          type="text"
                          className="form-input"
                          placeholder={form.entry_nature === 'CREDIT' ? 'Enter bill number' : 'Enter voucher number'}
                          value={form.entry_nature === 'CREDIT' ? form.bill_no : form.voucher_no}
                          onChange={handleChange(form.entry_nature === 'CREDIT' ? 'bill_no' : 'voucher_no')}
                          style={{ width: '100%' }}
                        />
                        <button type="button" className="btn btn-secondary" onClick={generateReference} style={{ whiteSpace: 'nowrap' }}>
                          Generate
                        </button>
                      </div>
                    </div>

                    {/* 3. Customer Name */}
                    <div className="form-group">
                      <label className="form-label">{lang === 'mr' ? 'संबोधन / नाव (पर्यायी)' : 'Mr. / Mrs. Name (Optional)'}</label>
                      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                        <select id="salutation" className="form-select"
                          style={{ width: 110, flexShrink: 0 }}
                          value={form.salutation} onChange={handleChange('salutation')}>
                          <option value="Mr.">{lang === 'mr' ? 'श्री. (Mr.)' : 'Mr.'}</option>
                          <option value="Mrs.">{lang === 'mr' ? 'सौ. (Mrs.)' : 'Mrs.'}</option>
                          <option value="Ms.">{lang === 'mr' ? 'कु. (Ms.)' : 'Ms.'}</option>
                          <option value="Dr.">{lang === 'mr' ? 'डॉ. (Dr.)' : 'Dr.'}</option>
                          <option value="Sri.">{lang === 'mr' ? 'श्री. (Sri.)' : 'Sri.'}</option>
                          <option value="Smt.">{lang === 'mr' ? 'श्रीमती (Smt.)' : 'Smt.'}</option>
                        </select>
                        <input id="customer-name" type="text" className="form-input"
                          placeholder={lang === 'mr' ? 'खातेधारकाचे पूर्ण नाव' : 'Full name of account holder'}
                          value={form.customer_name} onChange={handleChange('customer_name')} style={{ flex: 1 }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Right Column: Accountant, Entry Nature, Account Head ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 4. Accountant */}
                    <div className="form-group">
                      <label className="form-label">{lang === 'mr' ? 'लेखापालाचे नाव' : 'Accountant Name'}</label>
                      <input id="created-by" type="text" className="form-input"
                        placeholder={lang === 'mr' ? 'लेखापाल / कारकूनाचे नाव' : 'Accountant / clerk name'}
                        value={form.created_by} onChange={handleChange('created_by')} style={{ width: '100%' }} />
                    </div>

                    {/* 5. Entry Nature Toggle Switcher */}
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{lang === 'mr' ? 'व्यवहाराचे स्वरूप / वही प्रकार' : 'Transaction Nature / Book Type Entry'} <span className="required">*</span></span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {lang === 'mr' ? 'नोंदीचे स्वरूप निवडा' : 'Select entry nature'}
                        </span>
                      </label>
                      <div className="nature-pill-container" style={{ width: '100%', display: 'flex' }}>
                        <button
                          type="button"
                          className={`nature-pill-btn ${form.entry_nature === 'CREDIT' ? 'credit-active' : ''}`}
                          style={{ flex: 1, textAlign: 'center' }}
                          onClick={() => {
                            const newNature = 'CREDIT';
                            const currentType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                            const isStillValid = currentType && (currentType.entry_type === 'CREDIT' || currentType.entry_type === 'BOTH');
                            setForm(prev => ({
                              ...prev,
                              entry_nature: newNature,
                              transaction_type_id: isStillValid ? prev.transaction_type_id : '',
                            }));
                          }}
                        >
                          {lang === 'mr' ? '१. जमा नोंद (आवक)' : 'CREDIT ENTRY (Receipt Inflow)'}
                        </button>
                        <button
                          type="button"
                          className={`nature-pill-btn ${form.entry_nature === 'DEBIT' ? 'debit-active' : ''}`}
                          style={{ flex: 1, textAlign: 'center' }}
                          onClick={() => {
                            const newNature = 'DEBIT';
                            const currentType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                            const isStillValid = currentType && (currentType.entry_type === 'DEBIT' || currentType.entry_type === 'BOTH');
                            setForm(prev => ({
                              ...prev,
                              entry_nature: newNature,
                              transaction_type_id: isStillValid ? prev.transaction_type_id : '',
                            }));
                          }}
                        >
                          {lang === 'mr' ? '२. नावे नोंद (जावक)' : 'DEBIT ENTRY (Payment Outflow)'}
                        </button>
                      </div>
                    </div>

                    {/* 6. Transaction Type + Remarks */}
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          {lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} खाते नाव (Head)` : `${form.entry_nature} Account Head`} <span className="required">*</span>
                        </span>
                        {form.entry_nature && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 12,
                            background: form.entry_nature === 'CREDIT' ? '#dcfce7' : '#fee2e2',
                            color: form.entry_nature === 'CREDIT' ? '#15803d' : '#b91c1c',
                            border: form.entry_nature === 'CREDIT' ? '1px solid #86efac' : '1px solid #fca5a5',
                          }}>
                            {lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} वही` : `${form.entry_nature} BOOK`}
                          </span>
                        )}
                      </label>
                      <div style={{ width: '100%' }}>
                        <SearchableCombobox
                          value={form.transaction_type_id ? (txnTypes.find(t => String(t.id) === form.transaction_type_id)?.name || form.transaction_type_id) : ''}
                          onChange={val => {
                            const matchedType = txnTypes.find(t => t.name === val || String(t.id) === val);
                            const selectedId = matchedType ? String(matchedType.id) : val;
                            let defaultNature = form.entry_nature || 'CREDIT';
                            if (matchedType) {
                              if (matchedType.entry_type === 'DEBIT') defaultNature = 'DEBIT';
                              else if (matchedType.entry_type === 'CREDIT') defaultNature = 'CREDIT';
                            }
                            setForm(prev => ({
                              ...prev,
                              transaction_type_id: selectedId,
                              entry_nature: defaultNature,
                            }));
                          }}
                          options={Array.from(new Set([
                            ...(form.entry_nature === 'DEBIT' ? PAYMENT_PARTICULARS_OPTIONS : RECEIPT_PARTICULARS_OPTIONS),
                            ...txnTypes
                              .filter(t => t.entry_type === 'BOTH' || t.entry_type === form.entry_nature)
                              .map(t => t.name)
                          ]))}
                          allowCustom={true}
                          onAddNewOption={handleAddNewAccountHead}
                          lang={lang}
                          placeholder={lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} खाते शोधा किंवा निवडा` : `Search or select ${form.entry_nature} Head`}
                        />
                      </div>

                      {/* Configurable Credit / Debit selector for Sundry Account / Both types */}
                      {(() => {
                        const selType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                        if (selType && selType.entry_type === 'BOTH') {
                          return (
                            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'mr' ? 'नोंदीचे स्वरूप:' : 'Entry Nature:'}</span>
                              <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="radio"
                                  name="entry_nature"
                                  value="CREDIT"
                                  checked={form.entry_nature === 'CREDIT'}
                                  onChange={() => setForm(prev => ({ ...prev, entry_nature: 'CREDIT' }))}
                                />
                                {lang === 'mr' ? 'जमा वही (पावती)' : 'Credit Book (Receipt)'}
                              </label>
                              <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="radio"
                                  name="entry_nature"
                                  value="DEBIT"
                                  checked={form.entry_nature === 'DEBIT'}
                                  onChange={() => setForm(prev => ({ ...prev, entry_nature: 'DEBIT' }))}
                                />
                                {lang === 'mr' ? 'नावे वही (खर्च)' : 'Debit Book (Payment)'}
                              </label>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* 6b. Payment Mode (CASH entries auto-post to Cash Scroll Book) */}
                    <div className="form-group">
                      <label className="form-label">
                        {lang === 'mr' ? 'पेमेंट माध्यम (रोख / चेक)' : 'Payment Mode (Cash / Cheque)'}
                      </label>
                      <div className="nature-pill-container" style={{ width: '100%', display: 'flex' }}>
                        <button
                          type="button"
                          className={`nature-pill-btn ${form.payment_mode === 'CASH' ? 'credit-active' : ''}`}
                          style={{ flex: 1, textAlign: 'center' }}
                          onClick={() => setForm(prev => ({ ...prev, payment_mode: 'CASH' }))}
                        >
                          {lang === 'mr' ? 'रोख (Cash)' : 'CASH'}
                        </button>
                        <button
                          type="button"
                          className={`nature-pill-btn ${form.payment_mode === 'CHEQUE' ? 'debit-active' : ''}`}
                          style={{ flex: 1, textAlign: 'center' }}
                          onClick={() => setForm(prev => ({ ...prev, payment_mode: 'CHEQUE' }))}
                        >
                          {lang === 'mr' ? 'चेक (Cheque)' : 'CHEQUE'}
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, display: 'block' }}>
                        {lang === 'mr'
                          ? 'रोख नोंदी रोख स्क्रोल पुस्तकात स्वयंचलित नोंदवल्या जातात; चेक नोंदी चेक रकान्यात जातात.'
                          : 'CASH entries auto-post to the Cash Scroll Book; CHEQUE entries post to its Cheque column.'}
                      </span>
                    </div>
                  </div>

                  {/* ── 7. Remarks (Spans full width across both columns) ── */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">{lang === 'mr' ? 'शेरा' : 'Remarks'}</label>
                    <input id="remarks" type="text" className="form-input"
                      placeholder={lang === 'mr' ? 'पर्यायी शेरा' : 'Optional remarks'}
                      value={form.remarks} onChange={handleChange('remarks')} style={{ width: '100%' }} />
                  </div>

                  {/* ── 8. Attachments (for both CREDIT & DEBIT entries) ── */}
                  <AttachmentPicker />

                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* MODE 2: EXCEL SPREADSHEET GRID VIEW                           */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {viewMode === 'excel' && (
                <div className="excel-form-container" style={{ marginBottom: 20, width: '100%' }}>
                  <div className="excel-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Table size={16} color="#059669" />
                      <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                        {lang === 'mr' ? 'व्यवहार तपशील नोंदवही (एक्सेल ग्रिड)' : 'TRANSACTION_HEADER_ENTRY_SHEET (Excel Grid)'}
                      </span>
                      <span style={{ fontSize: 10, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
                        {lang === 'mr' ? '७ रकाने' : '7 Header Rows'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {lang === 'mr' ? 'सर्व रकाने एकाखाली एक ओळीत मांडलेले आहेत' : 'All fields aligned vertically row-by-row'}
                    </div>
                  </div>

                  <div className="excel-form-table-wrapper">
                    <table className="excel-form-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44, textAlign: 'center' }}>#</th>
                          <th style={{ width: 250 }}>{lang === 'mr' ? 'तपशील / रकाना' : 'Field / Description'}</th>
                          <th>{lang === 'mr' ? 'माहिती नोंद / मूल्य' : 'Data Entry / Input Value'}</th>
                          <th style={{ width: 280 }}>{lang === 'mr' ? 'पडताळणी आणि साधने' : 'Validation & Info'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Date */}
                        <tr>
                          <td className="excel-row-idx">1</td>
                          <td className="excel-col-label">
                            <span>{t('lbl_date')}</span>
                            <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                          </td>
                          <td className="excel-col-input">
                            <input id="txn-date-excel" type="date" className="form-input"
                              value={form.date} onChange={handleChange('date')} required style={{ maxWidth: 240, height: 38 }} />
                          </td>
                          <td className="excel-col-tools">
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{form.date}</span>
                          </td>
                        </tr>

                        {/* Row 2: Customer ID */}
                        <tr>
                          <td className="excel-row-idx">2</td>
                          <td className="excel-col-label">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Hash size={14} color="var(--blue-700)" />
                              <span>{lang === 'mr' ? '१०-अंकी ग्राहक आयडी / खाते क्र. (पर्यायी)' : '10-Digit Customer ID / Account No. (Optional)'}</span>
                            </div>
                          </td>
                          <td className="excel-col-input">
                            <input
                              id="customer-id-excel"
                              type="text"
                              maxLength={10}
                              list="saved-customers-list"
                              className="form-input"
                              placeholder={lang === 'mr' ? '१०-अंकी ओळख क्र. (e.g. 1000000001)' : 'Enter 10-Digit ID (e.g. 1000000001)'}
                              value={form.customer_id}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setForm(prev => ({ ...prev, customer_id: val }));
                                const match = customerList.find(c => c.customer_id === val || c.full_name === val);
                                if (match) {
                                  setForm(prev => ({
                                    ...prev,
                                    customer_id: match.customer_id,
                                    salutation: match.salutation || 'Mr.',
                                    customer_name: `${match.first_name}${match.middle_name ? ' ' + match.middle_name : ''} ${match.last_name}`.trim(),
                                  }));
                                  setAlert({ type: 'success', msg: `${lang === 'mr' ? 'ग्राहक आत्मचलित:' : 'Auto-filled customer:'} ${match.full_name}` });
                                }
                              }}
                              style={{ maxWidth: 280, height: 38 }}
                            />
                          </td>
                          <td className="excel-col-tools">
                            <span style={{ fontSize: 11, color: form.customer_id && form.customer_id.length === 10 ? '#15803d' : form.customer_id ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                              {form.customer_id ? `${form.customer_id.length}/10 digits` : 'Optional'}
                            </span>
                          </td>
                        </tr>

                        {/* Row 3: Accountant */}
                        <tr>
                          <td className="excel-row-idx">3</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? 'लेखापालाचे नाव' : 'Accountant Name'}</span>
                          </td>
                          <td className="excel-col-input">
                            <input id="created-by-excel" type="text" className="form-input"
                              placeholder={lang === 'mr' ? 'लेखापाल / कारकूनाचे नाव' : 'Accountant / clerk name'}
                              value={form.created_by} onChange={handleChange('created_by')} style={{ maxWidth: 360, height: 38 }} />
                          </td>
                          <td className="excel-col-tools">
                            <span style={{ fontSize: 11, color: '#64748b' }}>Clerk / Accountant</span>
                          </td>
                        </tr>

                        {/* Row 4: Customer Name */}
                        <tr>
                          <td className="excel-row-idx">4</td>
                          <td className="excel-col-label">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <UserIcon size={14} color="var(--blue-700)" />
                              <span>{lang === 'mr' ? 'संबोधन / नाव (पर्यायी)' : 'Mr. / Mrs. Name (Optional)'}</span>
                            </div>
                          </td>
                          <td className="excel-col-input">
                            <div style={{ display: 'flex', gap: 8, maxWidth: 460 }}>
                              <select id="salutation-excel" className="form-select"
                                style={{ width: 110, flexShrink: 0, height: 38 }}
                                value={form.salutation} onChange={handleChange('salutation')}>
                                <option value="Mr.">{lang === 'mr' ? 'श्री. (Mr.)' : 'Mr.'}</option>
                                <option value="Mrs.">{lang === 'mr' ? 'सौ. (Mrs.)' : 'Mrs.'}</option>
                                <option value="Ms.">{lang === 'mr' ? 'कु. (Ms.)' : 'Ms.'}</option>
                                <option value="Dr.">{lang === 'mr' ? 'डॉ. (Dr.)' : 'Dr.'}</option>
                                <option value="Sri.">{lang === 'mr' ? 'श्री. (Sri.)' : 'Sri.'}</option>
                                <option value="Smt.">{lang === 'mr' ? 'श्रीमती (Smt.)' : 'Smt.'}</option>
                              </select>
                              <input id="customer-name-excel" type="text" className="form-input"
                                placeholder={lang === 'mr' ? 'खातेधारकाचे पूर्ण नाव' : 'Full name of account holder'}
                                value={form.customer_name} onChange={handleChange('customer_name')} style={{ flex: 1, height: 38 }} />
                            </div>
                          </td>
                          <td className="excel-col-tools">
                            <span style={{ fontSize: 11, color: form.customer_name ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                              {form.customer_name ? '✓ ' + form.salutation + ' ' + form.customer_name : '* Required'}
                            </span>
                          </td>
                        </tr>

                        {/* Row 5: Entry Nature */}
                        <tr>
                          <td className="excel-row-idx">5</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? 'व्यवहाराचे स्वरूप' : 'Transaction Nature'}</span>
                            <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <div className="nature-pill-container" style={{ width: 'fit-content' }}>
                              <button
                                type="button"
                                className={`nature-pill-btn ${form.entry_nature === 'CREDIT' ? 'credit-active' : ''}`}
                                onClick={() => {
                                  const newNature = 'CREDIT';
                                  const currentType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                                  const isStillValid = currentType && (currentType.entry_type === 'CREDIT' || currentType.entry_type === 'BOTH');
                                  setForm(prev => ({
                                    ...prev,
                                    entry_nature: newNature,
                                    transaction_type_id: isStillValid ? prev.transaction_type_id : '',
                                  }));
                                }}
                              >
                                {lang === 'mr' ? '१. जमा नोंद (आवक → जमा वही)' : 'CREDIT ENTRY (Receipt Inflow → Credit Book)'}
                              </button>
                              <button
                                type="button"
                                className={`nature-pill-btn ${form.entry_nature === 'DEBIT' ? 'debit-active' : ''}`}
                                onClick={() => {
                                  const newNature = 'DEBIT';
                                  const currentType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                                  const isStillValid = currentType && (currentType.entry_type === 'DEBIT' || currentType.entry_type === 'BOTH');
                                  setForm(prev => ({
                                    ...prev,
                                    entry_nature: newNature,
                                    transaction_type_id: isStillValid ? prev.transaction_type_id : '',
                                  }));
                                }}
                              >
                                {lang === 'mr' ? '२. नावे नोंद (जावक → नावे वही)' : 'DEBIT ENTRY (Payment Outflow → Debit Book)'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Row 5b: Payment Mode */}
                        <tr>
                          <td className="excel-row-idx">5b</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? 'पेमेंट माध्यम (रोख / चेक)' : 'Payment Mode (Cash / Cheque)'}</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <div className="nature-pill-container" style={{ width: 'fit-content' }}>
                              <button
                                type="button"
                                className={`nature-pill-btn ${form.payment_mode === 'CASH' ? 'credit-active' : ''}`}
                                onClick={() => setForm(prev => ({ ...prev, payment_mode: 'CASH' }))}
                              >
                                {lang === 'mr' ? 'रोख (Cash)' : 'CASH'}
                              </button>
                              <button
                                type="button"
                                className={`nature-pill-btn ${form.payment_mode === 'CHEQUE' ? 'debit-active' : ''}`}
                                onClick={() => setForm(prev => ({ ...prev, payment_mode: 'CHEQUE' }))}
                              >
                                {lang === 'mr' ? 'चेक (Cheque)' : 'CHEQUE'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Row 6: Transaction Type / Head */}
                        <tr>
                          <td className="excel-row-idx">6</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} खाते नाव (Head)` : `${form.entry_nature} Account Head`}</span>
                            <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <SearchableCombobox
                              value={form.transaction_type_id ? (txnTypes.find(t => String(t.id) === form.transaction_type_id)?.name || form.transaction_type_id) : ''}
                              onChange={val => {
                                const matchedType = txnTypes.find(t => t.name === val || String(t.id) === val);
                                const selectedId = matchedType ? String(matchedType.id) : val;
                                let defaultNature = form.entry_nature || 'CREDIT';
                                if (matchedType) {
                                  if (matchedType.entry_type === 'DEBIT') defaultNature = 'DEBIT';
                                  else if (matchedType.entry_type === 'CREDIT') defaultNature = 'CREDIT';
                                }
                                setForm(prev => ({
                                  ...prev,
                                  transaction_type_id: selectedId,
                                  entry_nature: defaultNature,
                                }));
                              }}
                              options={Array.from(new Set([
                                ...(form.entry_nature === 'DEBIT' ? PAYMENT_PARTICULARS_OPTIONS : RECEIPT_PARTICULARS_OPTIONS),
                                ...txnTypes
                                  .filter(t => t.entry_type === 'BOTH' || t.entry_type === form.entry_nature)
                                  .map(t => t.name)
                              ]))}
                              allowCustom={true}
                              onAddNewOption={handleAddNewAccountHead}
                              lang={lang}
                              placeholder={lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} खाते शोधा किंवा निवडा` : `Search or select ${form.entry_nature} Head`}
                            />

                            {/* Configurable Credit / Debit selector for Sundry Account / Both types */}
                            {(() => {
                              const selType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                              if (selType && selType.entry_type === 'BOTH') {
                                return (
                                  <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'mr' ? 'नोंदीचे स्वरूप:' : 'Entry Nature:'}</span>
                                    <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <input
                                        type="radio"
                                        name="entry_nature_excel"
                                        value="CREDIT"
                                        checked={form.entry_nature === 'CREDIT'}
                                        onChange={() => setForm(prev => ({ ...prev, entry_nature: 'CREDIT' }))}
                                      />
                                      {lang === 'mr' ? 'जमा वही (पावती)' : 'Credit Book (Receipt)'}
                                    </label>
                                    <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <input
                                        type="radio"
                                        name="entry_nature_excel"
                                        value="DEBIT"
                                        checked={form.entry_nature === 'DEBIT'}
                                        onChange={() => setForm(prev => ({ ...prev, entry_nature: 'DEBIT' }))}
                                      />
                                      {lang === 'mr' ? 'नावे वही (खर्च)' : 'Debit Book (Payment)'}
                                    </label>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>
                        </tr>

                        {/* Row 7: Bill / Voucher number (depends on entry nature) */}
                        <tr>
                          <td className="excel-row-idx">7</td>
                          <td className="excel-col-label">
                            <span>{form.entry_nature === 'CREDIT' ? 'Bill Number (B.No.)' : 'Voucher Number (V.No.)'}</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                id="entry-reference-excel"
                                type="text"
                                className="form-input"
                                placeholder={form.entry_nature === 'CREDIT' ? 'Enter bill number' : 'Enter voucher number'}
                                value={form.entry_nature === 'CREDIT' ? form.bill_no : form.voucher_no}
                                onChange={handleChange(form.entry_nature === 'CREDIT' ? 'bill_no' : 'voucher_no')}
                                style={{ width: '100%', height: 38 }}
                              />
                              <button type="button" className="btn btn-secondary" onClick={generateReference} style={{ whiteSpace: 'nowrap' }}>
                                Generate
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Row 8: Remarks */}
                        <tr>
                          <td className="excel-row-idx">8</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? 'शेरा' : 'Remarks'}</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <input id="remarks-excel" type="text" className="form-input"
                              placeholder={lang === 'mr' ? 'पर्यायी शेरा' : 'Optional remarks'}
                              value={form.remarks} onChange={handleChange('remarks')} style={{ width: '100%', height: 38 }} />
                          </td>
                        </tr>

                        {/* Row 9: Attachments (for both CREDIT & DEBIT entries) */}
                        <tr>
                          <td className="excel-row-idx">9</td>
                          <td className="excel-col-label">
                            <span>{lang === 'mr' ? 'सोबतचे दस्तऐवज' : 'Attachments'}</span>
                          </td>
                          <td className="excel-col-input" colSpan={2}>
                            <AttachmentPicker />
                          </td>
                        </tr>

                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 2. Particulars Grid ── */}
              <div style={{ marginTop: 24, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    {lang === 'mr' ? 'तपशील' : 'Particulars'} <span className="required">*</span>
                  </label>
                  <button type="button" className="btn btn-primary btn-sm"
                    onClick={addRow} id="add-particular-btn">
                    <PlusCircle size={14} /> {lang === 'mr' ? 'ओळ जोडा' : 'Add Item'}
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                    padding: '8px 12px', borderBottom: '1px solid var(--border-muted)',
                  }}>
                    <ColHeader label={lang === 'mr' ? 'तपशील / वस्तूचे वर्णन' : 'Particular / Item Description'} />
                    <ColHeader label={lang === 'mr' ? 'रु.' : 'Rs.'} align="right" />
                    <ColHeader label={lang === 'mr' ? 'पै.' : 'Ps.'} align="right" />
                    <span />
                  </div>

                  {/* Item rows */}
                  {rows.map((row, idx) => (
                    <div key={row.id} style={{
                      display: 'grid', gridTemplateColumns: colGrid,
                      borderBottom: idx < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      alignItems: 'center',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}>
                      <div style={{ padding: '6px 8px 6px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                        <input id={`pdesc-${idx}`} type="text" className="form-input" style={gridInput}
                          placeholder={lang === 'mr' ? `बाब ${idx + 1} विवरण` : `Item ${idx + 1} description`}
                          value={row.description}
                          onChange={e => updateRow(row.id, 'description', e.target.value)} />
                      </div>
                      <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                        <input id={`prs-${idx}`} type="number" min="0" step="any"
                          className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                          placeholder="0" value={row.amount_rs}
                          onChange={e => updateRow(row.id, 'amount_rs', e.target.value)} />
                      </div>
                      <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                        <input id={`pps-${idx}`} type="number" min="0" max="99" step="any"
                          className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                          placeholder="00" value={row.amount_ps}
                          onChange={e => updateRow(row.id, 'amount_ps', e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button type="button" onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          id={`remove-row-${idx}`} title={lang === 'mr' ? 'ओळ हटवा' : 'Remove item'}
                          style={{
                            background: 'none', border: 'none', padding: 6, borderRadius: 6,
                            cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                            color: rows.length === 1 ? 'var(--text-muted)' : 'var(--red-600)',
                            display: 'flex', alignItems: 'center',
                          }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* ── 3. Particulars Total ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    background: '#f8fafc',
                    borderTop: '2px solid #bfdbfe',
                    padding: '9px 12px', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                      {lang === 'mr' ? `उप-एकूण (${rows.length} बाबी)` : `SUB-TOTAL (${rows.length} item${rows.length !== 1 ? 's' : ''})`}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--blue-700)', textAlign: 'right', paddingRight: 10 }}>
                      {Math.floor(particularsTotal).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--blue-700)', textAlign: 'right', paddingRight: 10 }}>
                      {String(Math.round((particularsTotal - Math.floor(particularsTotal)) * 100)).padStart(2, '0')}
                    </span>
                    <span />
                  </div>

                  {/* ── 4. CGST row ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    borderTop: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                    background: '#fffbeb',
                  }}>
                    <div style={{ padding: '6px 8px 6px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>{lang === 'mr' ? 'केंद्रीय GST %' : 'CGST %'}</span>
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input id="cgst-pct" type="number" min="0" max="50" step="0.5"
                        className="form-input" style={{ ...gridInput, textAlign: 'right', flex: 1 }}
                        placeholder="2.5" value={form.cgst_pct}
                        onChange={handleChange('cgst_pct')} />
                      <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>%</span>
                    </div>
                    <div style={{ padding: '6px 10px', borderRight: '1px solid var(--border-subtle)', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#92400e' }}>
                      {cgstAmt > 0 ? `₹ ${cgstAmt.toFixed(2)}` : '—'}
                    </div>
                    <span />
                  </div>

                  {/* ── 5. SGST row ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    borderTop: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                    background: '#fffbeb',
                  }}>
                    <div style={{ padding: '6px 8px 6px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>{lang === 'mr' ? 'राज्य GST %' : 'SGST %'}</span>
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input id="sgst-pct" type="number" min="0" max="50" step="0.5"
                        className="form-input" style={{ ...gridInput, textAlign: 'right', flex: 1 }}
                        placeholder="2.5" value={form.sgst_pct}
                        onChange={handleChange('sgst_pct')} />
                      <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>%</span>
                    </div>
                    <div style={{ padding: '6px 10px', borderRight: '1px solid var(--border-subtle)', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#92400e' }}>
                      {sgstAmt > 0 ? `₹ ${sgstAmt.toFixed(2)}` : '—'}
                    </div>
                    <span />
                  </div>

                  {/* Grand Total row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    borderTop: '2px solid #93c5fd',
                    padding: '10px 12px', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {lang === 'mr' ? 'एकूण बेरीज' : 'Grand Total'}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 17, color: 'var(--blue-700)', textAlign: 'right', paddingRight: 10 }}>
                      {grandRs.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 17, color: 'var(--blue-700)', textAlign: 'right', paddingRight: 10 }}>
                      {String(grandPs).padStart(2, '0')}
                    </span>
                    <span />
                  </div>
                </div>
              </div>

              {/* ── 5. Received Amount in Words (auto) ── */}
              <div style={{ marginTop: 16, width: '100%' }}>
                <label className="form-label">{lang === 'mr' ? 'रक्कम (अक्षरी)' : 'Received Amount (in Words)'}</label>
                <div style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 46,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-800)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {lang === 'mr' ? '₹ अक्षरी:' : '₹ IN WORDS:'}
                  </span>
                  <span id="amount-in-words" style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: grandTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontStyle: grandTotal > 0 ? 'normal' : 'italic',
                    flex: 1,
                  }}>
                    {grandTotal > 0 ? amountInWords : (lang === 'mr' ? 'अक्षरी गणनेसाठी तपशील व रक्कम टाका…' : 'Enter particulars to auto-calculate…')}
                  </span>
                </div>
              </div>

              {/* ── Bill Footer ── */}
              <div className="bill-footer" style={{ marginTop: 24, width: '100%' }}>
                <div className="signature-block">
                  <div className="signature-line" />
                  <div className="signature-label">{lang === 'mr' ? 'खातेधारकाची स्वाक्षरी' : 'Signature of Account Holder'}</div>
                </div>
                <div className="signature-block">
                  <div className="signature-line" />
                  <div className="signature-label">{lang === 'mr' ? 'लेखापाल' : 'Accountant'}</div>
                </div>
                <div className="total-amount-box">
                  <div className="label">{lang === 'mr' ? 'एकूण रक्कम' : 'TOTAL AMOUNT'}</div>
                  <div className="value">
                    ₹ {grandRs.toLocaleString('en-IN')}.{String(grandPs).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-start', flexWrap: 'wrap', alignItems: 'center', width: '100%' }} className="no-print">
                <button type="button" className="btn btn-secondary" onClick={() => handleReset(true)} id="reset-btn">
                  <RotateCcw size={15} /> {lang === 'mr' ? 'रीसेट' : 'Reset'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderColor: '#fde68a', color: '#b45309', background: '#fffbeb' }}
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  id="save-draft-btn"
                >
                  <FileEdit size={16} /> {lang === 'mr' ? 'मसुदा जतन करा' : 'Save as Draft'}
                </button>

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="save-btn">
                  {loading ? <span className="spinner" /> : <Save size={16} />}
                  {loading ? (lang === 'mr' ? 'जतन होत आहे…' : 'Posting…') : (lang === 'mr' ? 'जतन करा आणि पोस्ट करा' : 'Save & Post Transaction')}
                </button>
              </div>

              {alert && (
                <div
                  ref={submissionFeedbackRef}
                  className={`alert ${alert.type === 'info' ? 'alert-info' : alert.type === 'success' ? 'alert-success' : 'alert-error'} no-print`}
                  style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
                  role={alert.type === 'error' ? 'alert' : 'status'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {alert.type === 'info' ? <Loader2 size={18} className="spinner" /> : alert.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    <span style={{ fontWeight: 600 }}>{alert.msg}</span>
                  </div>
                  {alert.type === 'success' && lastSavedTxn && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setPrintingTxn(lastSavedTxn)}
                      style={{ marginLeft: 'auto', background: '#15803d', borderColor: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Printer size={14} /> {lang === 'mr' ? 'पावती मुद्रित करा' : 'Print Bill Receipt'}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ── 6. Period Transactions & Customer Monthly Statement ── */}
        <div className="card no-print">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Table size={18} color="var(--blue-700)" /> {lang === 'mr' ? 'ग्राहक कालावधी शोध आणि मासिक खाते विवरणपत्र' : 'Customer Period Search & Monthly Account Statement'}
              </div>
              <div className="card-subtitle">{lang === 'mr' ? 'कोणत्याही कालावधीसाठी संपूर्ण मासिक विवरणपत्र पाहण्यासाठी व मुद्रित करण्यासाठी शोध घ्या' : 'Search by Customer ID / Name for any period to view & print complete monthly statement'}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* View Switcher: Excel vs Vertical */}
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}>
                <button
                  type="button"
                  onClick={() => handleSearchViewModeChange('excel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: searchViewMode === 'excel' ? '#059669' : 'transparent',
                    color: searchViewMode === 'excel' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  id="search-excel-grid-btn"
                >
                  <Table size={14} /> {lang === 'mr' ? 'एक्सेल ग्रिड' : 'Excel Grid'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchViewModeChange('vertical')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: searchViewMode === 'vertical' ? '#2563eb' : 'transparent',
                    color: searchViewMode === 'vertical' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  id="search-vertical-btn"
                >
                  <List size={14} /> {lang === 'mr' ? 'उभी मांडणी' : 'Vertical Stack'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowStatementModal(true)}
                disabled={historyList.length === 0}
                id="print-monthly-stmt-btn"
              >
                <Printer size={14} /> {lang === 'mr' ? 'मासिक खाते विवरणपत्र मुद्रित करा' : 'Print Customer Monthly Statement'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SEARCH MODE 1: EXCEL SPREADSHEET GRID VIEW (Vertically Aligned) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {searchViewMode === 'excel' && (
              <div className="excel-form-container" style={{ marginBottom: 20, width: '100%' }}>
                <div className="excel-toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Table size={16} color="#059669" />
                    <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                      {lang === 'mr' ? 'कालावधी शोध निकष (एक्सेल ग्रिड)' : 'PERIOD_SEARCH_FILTER_SHEET (Excel Grid)'}
                    </span>
                    <span style={{ fontSize: 10, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
                      {lang === 'mr' ? '६ शोध निकष' : '6 Search Rows'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {lang === 'mr' ? 'सर्व शोध निकष एकाखाली एक ओळीत मांडलेले आहेत' : 'All search fields aligned vertically row-by-row'}
                  </div>
                </div>

                <div className="excel-form-table-wrapper">
                  <table className="excel-form-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: 'center' }}>#</th>
                        <th style={{ width: 250 }}>{lang === 'mr' ? 'शोध निकष / रकाना' : 'Search Parameter / Field'}</th>
                        <th>{lang === 'mr' ? 'शोध इनपुट / मूल्य' : 'Search Input / Selection'}</th>
                        <th style={{ width: 280 }}>{lang === 'mr' ? 'तपशील आणि सद्य स्थिती' : 'Description & Info'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: Customer ID / Name */}
                      <tr>
                        <td className="excel-row-idx">1</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserIcon size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'ग्राहक आयडी / नाव' : 'Customer ID / Name'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? '१०-अंकी आयडी किंवा ग्राहकाचे नाव' : '10-Digit ID or Customer Name'}</div>
                        </td>
                        <td className="excel-col-input">
                          <input
                            id="hist-cust-id"
                            type="text"
                            className="form-input"
                            placeholder={lang === 'mr' ? 'उदा. 1000000001 किंवा नाव' : 'e.g. 1000000001 or Name'}
                            value={hCustomerId}
                            onChange={e => setHCustomerId(e.target.value)}
                            style={{ width: '100%', maxWidth: 420, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {hCustomerId ? `🔍 ${hCustomerId}` : (lang === 'mr' ? 'सर्व ग्राहक' : 'All Customers')}
                          </span>
                        </td>
                      </tr>

                      {/* Row 2: From Date */}
                      <tr>
                        <td className="excel-row-idx">2</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'सुरुवातीची तारीख' : 'From Date'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? 'कालावधी प्रारंभ तारीख' : 'Search Period Start'}</div>
                        </td>
                        <td className="excel-col-input">
                          <input
                            id="hist-start"
                            type="date"
                            className="form-input"
                            value={hStartDate}
                            onChange={e => setHStartDate(e.target.value)}
                            style={{ width: '100%', maxWidth: 260, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{hStartDate}</span>
                        </td>
                      </tr>

                      {/* Row 3: To Date */}
                      <tr>
                        <td className="excel-row-idx">3</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'शेवटची तारीख' : 'To Date'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? 'कालावधी समाप्ती तारीख' : 'Search Period End'}</div>
                        </td>
                        <td className="excel-col-input">
                          <input
                            id="hist-end"
                            type="date"
                            className="form-input"
                            value={hEndDate}
                            onChange={e => setHEndDate(e.target.value)}
                            style={{ width: '100%', maxWidth: 260, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{hEndDate}</span>
                        </td>
                      </tr>

                      {/* Row 4: Book Entry Nature */}
                      <tr>
                        <td className="excel-row-idx">4</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BookOpen size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'वही नोंदीचे स्वरूप' : 'Book Entry Nature'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? 'जमा पावती किंवा नावे खर्च' : 'Receipts vs Payments'}</div>
                        </td>
                        <td className="excel-col-input">
                          <select
                            id="hist-nature"
                            className="form-select"
                            value={hNature}
                            onChange={e => setHNature(e.target.value)}
                            style={{ width: '100%', maxWidth: 360, height: 38, fontWeight: 700 }}
                          >
                            <option value="">— {lang === 'mr' ? 'सर्व (जमा आणि नावे)' : 'All (Credit & Debit)'} —</option>
                            <option value="CREDIT">📥 {lang === 'mr' ? 'केवळ जमा पावत्या' : 'CREDIT Receipts Only'}</option>
                            <option value="DEBIT">📤 {lang === 'mr' ? 'केवळ नावे खर्च' : 'DEBIT Payments Only'}</option>
                          </select>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {hNature === 'CREDIT' ? '📥 CREDIT Only' : hNature === 'DEBIT' ? '📤 DEBIT Only' : (lang === 'mr' ? 'सर्व प्रकार' : 'All Entries')}
                          </span>
                        </td>
                      </tr>

                      {/* Row 5: Transaction Type */}
                      <tr>
                        <td className="excel-row-idx">5</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'व्यवहाराचा प्रकार' : 'Transaction Type'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? 'विशिष्ट खाते नोंद शीर्षक' : 'Specific Ledger Account Head'}</div>
                        </td>
                        <td className="excel-col-input">
                          <select
                            id="hist-type"
                            className="form-select"
                            value={hTxnTypeId}
                            onChange={e => setHTxnTypeId(e.target.value)}
                            style={{ width: '100%', maxWidth: 420, height: 38 }}
                          >
                            <option value="">— {lang === 'mr' ? 'सर्व प्रकार' : 'All Types'} —</option>
                            {txnTypes.map(t => (
                              <option key={t.id} value={t.id}>
                                {lang === 'mr' ? getTxnHeadMarathi(t.name) : t.name} ({t.entry_type === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (t.entry_type === 'CREDIT' ? (lang === 'mr' ? 'जमा' : 'CREDIT') : (lang === 'mr' ? 'जमा/नावे' : 'BOTH'))})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {hTxnTypeId ? (txnTypes.find(t => String(t.id) === String(hTxnTypeId))?.name || 'Selected') : (lang === 'mr' ? 'सर्व खाती' : 'All Types')}
                          </span>
                        </td>
                      </tr>

                      {/* Row 6: Status */}
                      <tr>
                        <td className="excel-row-idx">6</td>
                        <td className="excel-col-label">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={14} color="var(--blue-700)" />
                            <span>{lang === 'mr' ? 'स्थिती' : 'Status'}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{lang === 'mr' ? 'नोंदीची सद्य स्थिती' : 'Posted vs Draft status'}</div>
                        </td>
                        <td className="excel-col-input">
                          <select
                            id="hist-status"
                            className="form-select"
                            value={hStatus}
                            onChange={e => setHStatus(e.target.value)}
                            style={{ width: '100%', maxWidth: 300, height: 38 }}
                          >
                            <option value="">— {lang === 'mr' ? 'सर्व स्थिती' : 'All Statuses'} —</option>
                            <option value="POSTED">{lang === 'mr' ? 'केवळ पोस्ट केलेले' : 'Posted Only'}</option>
                            <option value="DRAFT">{lang === 'mr' ? 'केवळ मसुदे' : 'Drafts Only'}</option>
                          </select>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {hStatus || (lang === 'mr' ? 'सर्व' : 'All')}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Filter Action Buttons Row */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px', background: '#f8fafc', borderTop: '1px solid #cbd5e1', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={loadHistory} id="hist-refresh-btn" style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> {lang === 'mr' ? 'नोंदी शोधा' : 'Filter Records'}
                  </button>

                  {(hCustomerId || hStartDate !== todayStr || hEndDate !== todayStr || hTxnTypeId || hStatus || hNature) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setHCustomerId('');
                        setHStartDate(todayStr);
                        setHEndDate(todayStr);
                        setHTxnTypeId('');
                        setHStatus('');
                        setHNature('');
                        fetchTransactions(todayStr, todayStr).then(setHistoryList);
                      }}
                      id="hist-reset-btn"
                      style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RotateCcw size={13} /> {lang === 'mr' ? 'रीसेट' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SEARCH MODE 2: VERTICAL STACK VIEW (Clean One Below Another)   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {searchViewMode === 'vertical' && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Row 1: Customer ID / Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'ग्राहक आयडी / नाव:' : 'Customer ID / Name:'}
                    </label>
                    <input
                      id="hist-cust-id"
                      type="text"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'उदा. 1000000001 किंवा नाव' : 'e.g. 1000000001 or Name'}
                      value={hCustomerId}
                      onChange={e => setHCustomerId(e.target.value)}
                      style={{ width: '100%', maxWidth: 420, height: 38 }}
                    />
                  </div>

                  {/* Row 2: From Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'सुरुवातीची तारीख:' : 'From Date:'}
                    </label>
                    <input
                      id="hist-start"
                      type="date"
                      className="form-input"
                      value={hStartDate}
                      onChange={e => setHStartDate(e.target.value)}
                      style={{ width: '100%', maxWidth: 260, height: 38 }}
                    />
                  </div>

                  {/* Row 3: To Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'शेवटची तारीख:' : 'To Date:'}
                    </label>
                    <input
                      id="hist-end"
                      type="date"
                      className="form-input"
                      value={hEndDate}
                      onChange={e => setHEndDate(e.target.value)}
                      style={{ width: '100%', maxWidth: 260, height: 38 }}
                    />
                  </div>

                  {/* Row 4: Book Entry Nature */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'वही नोंदीचे स्वरूप:' : 'Book Entry Nature:'}
                    </label>
                    <select
                      id="hist-nature"
                      className="form-select"
                      value={hNature}
                      onChange={e => setHNature(e.target.value)}
                      style={{ width: '100%', maxWidth: 360, height: 38, fontWeight: 700 }}
                    >
                      <option value="">— {lang === 'mr' ? 'सर्व (जमा आणि नावे)' : 'All (Credit & Debit)'} —</option>
                      <option value="CREDIT">📥 {lang === 'mr' ? 'केवळ जमा पावत्या' : 'CREDIT Receipts Only'}</option>
                      <option value="DEBIT">📤 {lang === 'mr' ? 'केवळ नावे खर्च' : 'DEBIT Payments Only'}</option>
                    </select>
                  </div>

                  {/* Row 5: Transaction Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'व्यवहाराचा प्रकार:' : 'Transaction Type:'}
                    </label>
                    <select
                      id="hist-type"
                      className="form-select"
                      value={hTxnTypeId}
                      onChange={e => setHTxnTypeId(e.target.value)}
                      style={{ width: '100%', maxWidth: 420, height: 38 }}
                    >
                      <option value="">— {lang === 'mr' ? 'सर्व प्रकार' : 'All Types'} —</option>
                      {txnTypes.map(t => (
                        <option key={t.id} value={t.id}>
                          {lang === 'mr' ? getTxnHeadMarathi(t.name) : t.name} ({t.entry_type === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (t.entry_type === 'CREDIT' ? (lang === 'mr' ? 'जमा' : 'CREDIT') : (lang === 'mr' ? 'जमा/नावे' : 'BOTH'))})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 6: Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'स्थिती:' : 'Status:'}
                    </label>
                    <select
                      id="hist-status"
                      className="form-select"
                      value={hStatus}
                      onChange={e => setHStatus(e.target.value)}
                      style={{ width: '100%', maxWidth: 300, height: 38 }}
                    >
                      <option value="">— {lang === 'mr' ? 'सर्व स्थिती' : 'All Statuses'} —</option>
                      <option value="POSTED">{lang === 'mr' ? 'केवळ पोस्ट केलेले' : 'Posted Only'}</option>
                      <option value="DRAFT">{lang === 'mr' ? 'केवळ मसुदे' : 'Drafts Only'}</option>
                    </select>
                  </div>
                </div>

                {/* Vertical Mode Action Buttons */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingTop: 16, marginTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn btn-primary btn-sm" onClick={loadHistory} id="hist-refresh-btn" style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> {lang === 'mr' ? 'नोंदी शोधा' : 'Filter Records'}
                  </button>

                  {(hCustomerId || hStartDate !== todayStr || hEndDate !== todayStr || hTxnTypeId || hStatus || hNature) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setHCustomerId('');
                        setHStartDate(todayStr);
                        setHEndDate(todayStr);
                        setHTxnTypeId('');
                        setHStatus('');
                        setHNature('');
                        fetchTransactions(todayStr, todayStr).then(setHistoryList);
                      }}
                      id="hist-reset-btn"
                      style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RotateCcw size={13} /> {lang === 'mr' ? 'रीसेट' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Total Amount & Count Summary Banner */}
            <div className="stat-row" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <div className="stat-label" style={{ color: '#1e40af' }}>{lang === 'mr' ? 'एकूण सापडलेल्या नोंदी' : 'Total Records Found'}</div>
                <div className="stat-value" style={{ color: '#1d4ed8' }}>{displayedHistoryList.length}</div>
              </div>
              <div className="stat-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <div className="stat-label" style={{ color: '#166534' }}>{lang === 'mr' ? 'एकूण जमा पावत्या' : 'Total Credit Receipts'}</div>
                <div className="stat-value" style={{ color: '#15803d', fontSize: 18 }}>
                  ₹ {historyCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="stat-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <div className="stat-label" style={{ color: '#991b1b' }}>{lang === 'mr' ? 'एकूण नावे खर्च' : 'Total Debit Payments'}</div>
                <div className="stat-value" style={{ color: '#b91c1c', fontSize: 18 }}>
                  ₹ {historyDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderColor: '#93c5fd' }}>
                <div className="stat-label" style={{ color: '#1e40af' }}>{lang === 'mr' ? 'कालावधीची एकूण रक्कम' : 'Total Period Amount'}</div>
                <div className="stat-value" style={{ color: '#1d4ed8', fontSize: 20 }}>
                  ₹ {historyTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Table of Period Records */}
            <div className="table-wrapper">
              {hLoading ? (
                <div className="loading-overlay">
                  <span className="spinner" /> {lang === 'mr' ? 'कालावधीच्या नोंदी लोड होत आहेत…' : 'Loading period records…'}
                </div>
              ) : displayedHistoryList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Filter /></div>
                  <div className="empty-state-title">{lang === 'mr' ? 'कोणतेही जुळणारे व्यवहार आढळले नाहीत' : 'No matching transactions found'}</div>
                  <div className="empty-state-sub">{lang === 'mr' ? 'कृपया वरील ग्राहक आयडी, तारीख श्रेणी किंवा फिल्टर बदलून पहा' : 'Try adjusting Customer ID, date range, book entry nature, or transaction type filter above'}</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{lang === 'mr' ? 'ग्राहक आयडी' : 'Customer ID'}</th>
                      <th>{lang === 'mr' ? 'तारीख' : 'Date'}</th>
                      <th>{lang === 'mr' ? 'रोख मेमो क्र.' : 'Cash Memo No.'}</th>
                      <th>{lang === 'mr' ? 'ग्राहकाचे नाव' : 'Customer Name'}</th>
                      <th>{lang === 'mr' ? 'व्यवहाराचा प्रकार' : 'Transaction Type'}</th>
                      <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                       <th style={{ textAlign: 'right', color: '#15803d' }}>{lang === 'mr' ? 'जमा रक्कम' : 'Credit Amt (Rs.Ps)'}</th>
                       <th style={{ textAlign: 'right', color: '#b91c1c' }}>{lang === 'mr' ? 'नावे रक्कम' : 'Debit Amt (Rs.Ps)'}</th>
                      <th>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
                      <th>{lang === 'mr' ? 'क्रिया' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistoryList.map(txn => {
                      const totalAmt = Number(txn.amount_rs) + Number(txn.amount_ps) / 100;
                      const nature = txn.entry_nature || txn.transaction_type?.entry_type || 'CREDIT';
                      return (
                        <tr key={txn.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)' }}>
                            {txn.customer_id || '—'}
                          </td>
                          <td>{txn.date}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{txn.cash_memo_no}</td>
                          <td style={{ fontWeight: 600 }}>{txn.customer_name}</td>
                          <td>
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: nature === 'DEBIT' ? '#b91c1c' : 'var(--blue-700)'
                            }}>
                              {lang === 'mr' ? getTxnHeadMarathi(txn.transaction_type?.name) : (txn.transaction_type?.name || '—')} ({nature === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (lang === 'mr' ? 'जमा' : 'CREDIT')})
                            </span>
                          </td>
                          <td
                            style={{ maxWidth: expandedParticularsId === txn.id ? 320 : 220, fontSize: 12, cursor: 'pointer' }}
                            onClick={() => setExpandedParticularsId(expandedParticularsId === txn.id ? null : txn.id)}
                          >
                            <div style={{
                              whiteSpace: expandedParticularsId === txn.id ? 'normal' : 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: 'var(--text-primary)',
                            }} title={txn.particulars || '—'}>
                              {txn.particulars || '—'}
                            </div>
                            {txn.particulars && txn.particulars.length > 25 && (
                              <span style={{ fontSize: 10, color: 'var(--blue-700)', fontWeight: 700, display: 'block', marginTop: 2 }}>
                                {expandedParticularsId === txn.id ? (lang === 'mr' ? '▲ कमी करा' : '▲ Collapse') : (lang === 'mr' ? '▼ अधिक पहा' : '▼ Expand Items')}
                              </span>
                            )}
                            {(() => {
                              let atts: { path: string; name: string }[] = [];
                              try {
                                const parsed = txn.attachments ? JSON.parse(txn.attachments) : [];
                                if (Array.isArray(parsed)) atts = parsed.filter((a: { path?: string }) => a && a.path);
                              } catch { /* ignore malformed attachments */ }
                              if (atts.length === 0) return null;
                              return (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                  {atts.map((a, ai) => (
                                    <button
                                      key={`h-att-${txn.id}-${ai}`}
                                      type="button"
                                      onClick={() => setPreviewDoc({ path: a.path, name: a.name || 'Attachment' })}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1px 8px', cursor: 'pointer' }}
                                      title={lang === 'mr' ? 'प्रीव्ह्यू पहा' : 'Show preview'}
                                    >
                                      <Paperclip size={10} /> {a.name || 'Attachment'}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                            {nature === 'CREDIT' ? `₹ ${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c' }}>
                            {nature === 'DEBIT' ? `₹ ${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: txn.status === 'POSTED' ? '#dcfce7' : '#fef3c7',
                              color: txn.status === 'POSTED' ? '#15803d' : '#b45309',
                              border: txn.status === 'POSTED' ? '1px solid #86efac' : '1px solid #fde68a',
                            }}>
                              {txn.status === 'POSTED' ? (lang === 'mr' ? 'पोस्ट केलेले' : 'POSTED') : (lang === 'mr' ? 'मसुदा' : 'DRAFT')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setPrintingTxn(txn)}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4 }}
                                title={lang === 'mr' ? 'पावती मुद्रित करा' : 'Print Bill Receipt'}
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void openForEdit(txn)}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4 }}
                                title={lang === 'mr' ? 'व्यवहार संपादन करा' : 'Edit Transaction'}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(txn.id, txn.cash_memo_no)}
                                style={{ background: 'none', border: 'none', color: 'var(--red-600)', cursor: 'pointer', padding: 4 }}
                                title={lang === 'mr' ? 'व्यवहार हटवा' : 'Delete Transaction'}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ fontWeight: 700 }}>{lang === 'mr' ? `कालावधी एकूण (${historyList.length} व्यवहार)` : `PERIOD TOTAL (${historyList.length} Transactions)`}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#15803d' }}>
                        ₹ {historyCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#b91c1c' }}>
                        ₹ {historyDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── Saved Drafts Modal / Drawer ── */}
        {showDraftsModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 1000, padding: 20,
          }}>
            <div style={{
              background: '#ffffff', border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 700,
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)', margin: '0 auto',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpen size={18} color="var(--amber-500)" /> {lang === 'mr' ? `जतन केलेले मसुदे (${drafts.length})` : `Saved Drafts (${drafts.length})`}
                </div>
                <button
                  onClick={() => setShowDraftsModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                {drafts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {lang === 'mr' ? 'कोणतेही जतन केलेले मसुदे आढळले नाहीत.' : 'No saved drafts found.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {drafts.map(d => (
                      <div key={d.id} style={{
                        padding: 14, background: '#f8fafc', border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d.customer_name || (lang === 'mr' ? 'अनामित ग्राहक' : 'Unnamed Customer')}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {lang === 'mr' ? 'मेमो:' : 'Memo:'} {d.cash_memo_no} | {lang === 'mr' ? 'तारीख:' : 'Date:'} {d.date} | {lang === 'mr' ? 'तपशील:' : 'Particulars:'} {d.particulars || '—'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-700)', marginTop: 4 }}>
                            ₹ {Number(d.amount_rs).toLocaleString('en-IN')}.{String(d.amount_ps).padStart(2, '0')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPrintingTxn(d)}
                            title={lang === 'mr' ? 'पावती मुद्रित करा' : 'Print Bill Receipt'}
                          >
                            <Printer size={14} /> {lang === 'mr' ? 'मुद्रण' : 'Print'}
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => void openForEdit(d)}
                          >
                            {lang === 'mr' ? 'लोड करा' : 'Load Draft'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteTransaction(d.id, d.cash_memo_no)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Printable Bill Receipt Modal ── */}
        <ReceiptModal
          transaction={printingTxn}
          office={office}
          onClose={() => setPrintingTxn(null)}
        />

        {/* ── Printable Customer Monthly Statement Modal ── */}
        <CustomerStatementModal
          isOpen={showStatementModal}
          customerId={hCustomerId}
          customerName={historyList[0]?.customer_name || ''}
          startDate={hStartDate}
          endDate={hEndDate}
          transactions={historyList}
          office={office}
          onClose={() => setShowStatementModal(false)}
        />

        {/* ── Attachment Preview Modal ── */}
        {previewDoc && (
          <AttachmentPreviewModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
        )}

      </div>
    </div>
  );
};

export default CreditAccountForm;
