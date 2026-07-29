import React, { useEffect, useState, useCallback } from 'react';
import {
  Save, RotateCcw, CheckCircle, XCircle,
  Hash, Phone, Building2, CreditCard,
  PlusCircle, Trash2, FileEdit, FolderOpen,
  RefreshCw, Edit3, Filter, Table, Printer, User as UserIcon,
} from 'lucide-react';
import Header from '../components/Header';
import ReceiptModal from '../components/ReceiptModal';
import CustomerStatementModal from '../components/CustomerStatementModal';
import {
  fetchOffice,
  fetchTransactionTypes,
  fetchNextMemo,
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
} from '../api/client';
import type { OfficeMaster, TransactionType, Transaction, User, Customer } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useTranslateData } from '../hooks/useTranslateData';

// ─── Marathi Transaction Head Translations ───────────────────────────────────────
const TXN_HEAD_MAP_MR: Record<string, string> = {
  'Shares': 'समभाग (Shares)',
  'Purchases': 'खरेदी (Purchases)',
  'Commissions': 'कमिशन (Commissions)',
  'Loan a/c': 'कर्ज खाते (Loan a/c)',
  'Interest': 'व्याज (Interest)',
  'Pigmi Comm.': 'पिगमी कमिशन (Pigmi Comm.)',
  'Bank Current': 'बँक चालू खाते (Bank Current)',
  'Advance': 'आगाऊ (Advance)',
  'Lakshmi Pigmi Deposit': 'लक्ष्मी पिगमी ठेव (Lakshmi Pigmi Deposit)',
  'Vegetable Comm.': 'भाजीपाला कमिशन (Vegetable Comm.)',
  'Sundary a/c': 'विविध खाते (Sundary a/c)',
  'Cash Sales': 'रोख विक्री (Cash Sales)',
  'Pesticide Sales': 'कीटकनाशक विक्री (Pesticide Sales)',
  'Cold Storage Adv': 'शीतगृह आगाऊ (Cold Storage Adv)',
  'Lakshmi Pigmi Loan': 'लक्ष्मी पिगमी कर्ज (Lakshmi Pigmi Loan)',
  'Lakshmi Pigmi Interest': 'लक्ष्मी पिगमी व्याज (Lakshmi Pigmi Interest)',
};

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

// ─── Types ───────────────────────────────────────────────────────────────────
interface ParticularRow {
  id: number;
  description: string;
  amount_rs: string;
  amount_ps: string;
}

let _rowId = 1;
const newRow = (): ParticularRow => ({ id: _rowId++, description: '', amount_rs: '', amount_ps: '00' });

interface FormState {
  date: string;
  customer_id: string;
  salutation: string;
  customer_name: string;
  transaction_type_id: string;
  entry_nature: 'CREDIT' | 'DEBIT';
  remarks: string;
  cgst_rs: string;
  cgst_ps: string;
  sgst_rs: string;
  sgst_ps: string;
  created_by: string;
}

const INITIAL_FORM: FormState = {
  date: new Date().toISOString().split('T')[0],
  customer_id: '',
  salutation: 'Mr.',
  customer_name: '',
  transaction_type_id: '',
  entry_nature: 'CREDIT',
  remarks: '',
  cgst_rs: '2.5',
  cgst_ps: '00',
  sgst_rs: '2.5',
  sgst_ps: '00',
  created_by: '',
};

const rowAmount = (r: ParticularRow) =>
  parseFloat(r.amount_rs || '0') + parseFloat(r.amount_ps || '0') / 100;

const gridInput: React.CSSProperties = { padding: '7px 10px', fontSize: 13 };

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

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
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
  const [hStartDate, setHStartDate] = useState(firstOfMonthStr);
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
          loadDraftIntoForm(t);
          setAlert({ type: 'success', msg: `Editing transaction ${t.cash_memo_no}` });
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
  }, [loadDrafts]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const refreshMemo = useCallback((d: string) => {
    fetchNextMemo(d).then(r => setNextMemo(r.cash_memo_no)).catch(() => setNextMemo('BGS-AUTO'));
  }, []);

  useEffect(() => { refreshMemo(form.date); }, [form.date, refreshMemo]);

  // ── Debounced Live Particulars Translation via 8001 microservice & DB cache ──
  const isMarathi = lang === 'mr';
  useEffect(() => {
    if (!isMarathi) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    rows.forEach((row) => {
      const text = row.description.trim();
      if (text && /[a-zA-Z]/.test(text)) {
        const timer = setTimeout(() => {
          translateText(text)
            .then(res => {
              if (res && res.translated_text && res.translated_text !== text) {
                setRows(prev =>
                  prev.map(r => (r.id === row.id && r.description === row.description ? { ...r, description: res.translated_text } : r))
                );
              }
            })
            .catch(() => {});
        }, 350);
        timers.push(timer);
      }
    });
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [rows, isMarathi]);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      setAlert(null);
    };

  // ── Particulars grid ────────────────────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id: number) =>
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  const updateRow = (id: number, field: keyof Omit<ParticularRow, 'id'>, value: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  // ── Computed totals for entry form ──────────────────────────────────────────
  const particularsTotal = rows.reduce((s, r) => s + rowAmount(r), 0);
  const cgst  = parseFloat(form.cgst_rs  || '0') + parseFloat(form.cgst_ps  || '0') / 100;
  const sgst  = parseFloat(form.sgst_rs  || '0') + parseFloat(form.sgst_ps  || '0') / 100;
  const grandTotal = particularsTotal + cgst + sgst;
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
    if (isDraft) {
      if (!form.customer_name.trim()) {
        setAlert({ type: 'error', msg: 'Please enter at least customer name to save a draft.' });
        return;
      }
    } else {
      if (!form.customer_name.trim()) {
        setAlert({ type: 'error', msg: 'Please enter the customer name.' }); return;
      }
      if (!form.transaction_type_id) {
        setAlert({ type: 'error', msg: 'Please select a transaction type.' }); return;
      }
      const hasItems = rows.some(r => r.description.trim() || parseFloat(r.amount_rs || '0') > 0);
      if (!hasItems || grandTotal <= 0) {
        setAlert({ type: 'error', msg: 'Please add at least one particular with an amount.' }); return;
      }
    }

    const particularsText = rows
      .filter(r => r.description.trim())
      .map(r => `${r.description}: Rs.${parseFloat(r.amount_rs || '0').toFixed(0)}.${r.amount_ps || '00'}`)
      .join(' | ');

    const taxNote = [
      cgst > 0 ? `CGST: Rs.${cgst.toFixed(2)}` : '',
      sgst > 0 ? `SGST: Rs.${sgst.toFixed(2)}` : '',
    ].filter(Boolean).join(', ');

    setLoading(true);
    try {
      const payload = {
        date: form.date,
        customer_id: form.customer_id.trim() || undefined,
        customer_name: form.customer_name.startsWith(form.salutation) ? form.customer_name : `${form.salutation} ${form.customer_name}`,
        particulars: [particularsText, taxNote].filter(Boolean).join(' — '),
        transaction_type_id: parseInt(form.transaction_type_id || '1'),
        entry_nature: form.entry_nature,
        amount_rs: grandRs,
        amount_ps: grandPs,
        remarks: form.remarks,
        created_by: form.created_by,
        status: isDraft ? 'DRAFT' : 'POSTED',
      };

      let saved: Transaction;
      if (editingDraftId) {
        saved = await updateTransaction(editingDraftId, payload);
      } else {
        saved = await createTransaction(payload);
      }

      setSavedMemo(saved.cash_memo_no);
      setLastSavedTxn(saved);
      loadDrafts();
      loadHistory();

      if (isDraft) {
        setAlert({ type: 'success', msg: `Draft saved successfully! (Memo: ${saved.cash_memo_no})` });
        setEditingDraftId(saved.id);
      } else {
        localStorage.removeItem('bgs_credit_form_draft');
        setAlert({ type: 'success', msg: `Transaction posted successfully! Cash Memo: ${saved.cash_memo_no}` });
        handleReset();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Save failed. Check backend connection.';
      setAlert({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('bgs_credit_form_draft');
    setForm(INITIAL_FORM);
    setRows([newRow()]);
    setAlert(null);
    setSavedMemo(null);
    setEditingDraftId(null);
    refreshMemo(INITIAL_FORM.date);
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
      salutation: sal,
      customer_name: custName,
      transaction_type_id: String(d.transaction_type_id),
      entry_nature: (d.entry_nature as 'CREDIT' | 'DEBIT') || 'CREDIT',
      remarks: d.remarks || '',
      cgst_rs: '2.5',
      cgst_ps: '00',
      sgst_rs: '2.5',
      sgst_ps: '00',
      created_by: d.created_by || '',
    });

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
        msg: `Successfully added June 2026 test dataset! (${res.inserted} inserted, ${res.skipped} skipped)`,
      });
      loadHistory();
      refreshMemo(form.date);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to seed June test data.' });
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
          : 'Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.'}
        level={1}
        showPrint={!!savedMemo}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      <div className="page-content">

        {/* ── June Test Dataset Toolbar ── */}
        <div className="no-print" style={{
          marginBottom: 16, padding: '12px 18px', background: '#f8fafc',
          borderRadius: 10, border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-700)' }}>
              {lang === 'mr' ? '🧪 जून २०२६ चाचणी डेटा संच टूलबार' : '🧪 June 2026 Test Dataset Toolbar'}
            </span>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {lang === 'mr' ? 'सर्व १६ जमा आणि नावे खात्यांच्या १८ चाचणी नोंदी जोडा किंवा साफ करा' : 'Add or clear 18 test transactions covering all 16 Credit & Debit heads'}
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
              <PlusCircle size={14} /> {lang === 'mr' ? '➕ जून चाचणी नोंदी जोडा' : '➕ Add June Test Records'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearJuneData}
              disabled={loading}
              style={{ borderColor: 'var(--red-600)', color: 'var(--red-600)', background: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={14} /> {lang === 'mr' ? '🗑️ जून चाचणी नोंदी हटवा' : '🗑️ Delete June Test Records'}
            </button>
          </div>
        </div>

        {/* ── Alert ── */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {alert.msg}
          </div>
        )}

        {/* ── Static Banner ── */}
        <div className="static-banner">
          <div className="org-title">
            {lang === 'mr'
              ? <>बेळगाव गार्डनर्स को-ऑप उत्पादन पुरवठा आणि विक्री सोसायटी लि.<br /><span style={{ fontSize: 13, fontWeight: 500 }}>बेळगाव, कर्नाटक</span></>
              : <>Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.<br /><span style={{ fontSize: 13, fontWeight: 500 }}>Belagavi, Karnataka</span></>}
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
              <span>{office?.address ?? (lang === 'mr' ? 'बेळगाव, कर्नाटक - 590001' : 'Belagavi, Karnataka - 590001')}</span>
            </div>
          </div>
        </div>

        {/* ── Bill Form Card ── */}
        <div className="card" style={{ marginBottom: 32 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <div className="form-grid">

                {/* Date */}
                <div className="form-group">
                  <label className="form-label">{t('lbl_date')} <span className="required">*</span></label>
                  <input id="txn-date" type="date" className="form-input"
                    value={form.date} onChange={handleChange('date')} required />
                </div>

                {/* Customer ID */}
                <div className="form-group">
                  <label className="form-label">{lang === 'mr' ? '१०-अंकी ग्राहक ओळख क्र. / खाते क्र.' : '10-Digit Customer ID / Account No.'}</label>
                  <input
                    id="customer-id"
                    type="text"
                    list="saved-customers-list"
                    className="form-input"
                    placeholder={lang === 'mr' ? '१०-अंकी ओळख क्र. शोधा (e.g. 1000000001)' : 'Search/Select 10-Digit ID (e.g. 1000000001)'}
                    value={form.customer_id}
                    onChange={e => {
                      const val = e.target.value;
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
                  />
                  <datalist id="saved-customers-list">
                    {customerList.map(c => (
                      <option key={c.id} value={c.customer_id}>
                        {c.full_name} ({c.mobile_no || (lang === 'mr' ? 'मोबाइल नाही' : 'No Mobile')})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Accountant */}
                <div className="form-group">
                  <label className="form-label">{lang === 'mr' ? 'लेखापालाचे नाव' : 'Accountant Name'}</label>
                  <input id="created-by" type="text" className="form-input"
                    placeholder={lang === 'mr' ? 'लेखापाल / कारकूनाचे नाव' : 'Accountant / clerk name'}
                    value={form.created_by} onChange={handleChange('created_by')} />
                </div>

                {/* Customer Name */}
                <div className="form-group full-width">
                  <label className="form-label">{lang === 'mr' ? 'संबोधन / नाव' : 'Mr. / Mrs. Name'} <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
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
                      value={form.customer_name} onChange={handleChange('customer_name')} required />
                  </div>
                </div>

                {/* Entry Nature Toggle Switcher */}
                <div className="form-group full-width" style={{ marginTop: 6, marginBottom: 6 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{lang === 'mr' ? 'व्यवहाराचे स्वरूप / वही प्रकार' : 'Transaction Nature / Book Type Entry'} <span className="required">*</span></span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {lang === 'mr' ? 'नोंदीचे स्वरूप निवडा' : 'Select entry nature to filter matching heads'}
                    </span>
                  </label>
                  <div className="nature-pill-container">
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
                </div>

                {/* ── 1. Transaction Type + Remarks ── */}
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
                  <select
                    id="txn-type"
                    className="form-select"
                    value={form.transaction_type_id}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedType = txnTypes.find(t => String(t.id) === selectedId);
                      let defaultNature = form.entry_nature || 'CREDIT';
                      if (selectedType) {
                        if (selectedType.entry_type === 'DEBIT') defaultNature = 'DEBIT';
                        else if (selectedType.entry_type === 'CREDIT') defaultNature = 'CREDIT';
                      }
                      setForm(prev => ({
                        ...prev,
                        transaction_type_id: selectedId,
                        entry_nature: defaultNature,
                      }));
                    }}
                    required
                  >
                    <option value="">— {lang === 'mr' ? `${form.entry_nature === 'CREDIT' ? 'जमा' : 'नावे'} खाते निवडा` : `Select ${form.entry_nature} Head`} —</option>
                    {txnTypes
                      .filter(t => t.entry_type === 'BOTH' || t.entry_type === form.entry_nature)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {lang === 'mr' ? (TXN_HEAD_MAP_MR[t.name] || t.name) : t.name} ({t.entry_type === 'BOTH' ? (lang === 'mr' ? 'जमा/नावे दोन्ही' : 'Configurable Credit/Debit') : (t.entry_type === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (lang === 'mr' ? 'जमा' : 'CREDIT'))})
                        </option>
                      ))}
                  </select>

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

                <div className="form-group">
                  <label className="form-label">{lang === 'mr' ? 'शेरा' : 'Remarks'}</label>
                  <input id="remarks" type="text" className="form-input"
                    placeholder={lang === 'mr' ? 'पर्यायी शेरा' : 'Optional remarks'}
                    value={form.remarks} onChange={handleChange('remarks')} />
                </div>

              </div>{/* /form-grid */}

              {/* ── 2. Particulars Grid ── */}
              <div style={{ marginTop: 24 }}>
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
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>{lang === 'mr' ? 'केंद्रीय GST' : 'CGST'}</span>
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input id="cgst-rs" type="number" min="0" step="any"
                        className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                        placeholder="0" value={form.cgst_rs}
                        onChange={handleChange('cgst_rs')} />
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input id="cgst-ps" type="number" min="0" max="99" step="any"
                        className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                        placeholder="00" value={form.cgst_ps}
                        onChange={handleChange('cgst_ps')} />
                    </div>
                    <span />
                  </div>

                  {/* ── 4. SGST row ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    borderTop: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                    background: '#fffbeb',
                  }}>
                    <div style={{ padding: '6px 8px 6px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>{lang === 'mr' ? 'राज्य GST' : 'SGST'}</span>
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input id="sgst-rs" type="number" min="0" step="any"
                        className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                        placeholder="0" value={form.sgst_rs}
                        onChange={handleChange('sgst_rs')} />
                    </div>
                    <div style={{ padding: '6px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input id="sgst-ps" type="number" min="0" max="99" step="any"
                        className="form-input" style={{ ...gridInput, textAlign: 'right' }}
                        placeholder="00" value={form.sgst_ps}
                        onChange={handleChange('sgst_ps')} />
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
              <div style={{ marginTop: 16 }}>
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
              <div className="bill-footer" style={{ marginTop: 24 }}>
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
              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }} className="no-print">
                <button type="button" className="btn btn-secondary" onClick={handleReset} id="reset-btn">
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

          <div className="card-body">
            {/* Filter Bar */}
            <div className="filter-bar" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 20 }}>
              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'ग्राहक आयडी / नाव:' : 'Customer ID / Name:'}</span>
                <input
                  id="hist-cust-id"
                  type="text"
                  className="filter-input"
                  placeholder={lang === 'mr' ? 'उदा. CUST-1001 किंवा नाव' : 'e.g. CUST-1001 or Name'}
                  value={hCustomerId}
                  onChange={e => setHCustomerId(e.target.value)}
                  style={{ minWidth: 160 }}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'सुरुवातीची तारीख:' : 'From Date:'}</span>
                <input
                  id="hist-start"
                  type="date"
                  className="filter-input"
                  value={hStartDate}
                  onChange={e => setHStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'शेवटची तारीख:' : 'To Date:'}</span>
                <input
                  id="hist-end"
                  type="date"
                  className="filter-input"
                  value={hEndDate}
                  onChange={e => setHEndDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'वही नोंदीचे स्वरूप:' : 'Book Entry Nature:'}</span>
                <select
                  id="hist-nature"
                  className="filter-select"
                  value={hNature}
                  onChange={e => setHNature(e.target.value)}
                  style={{ minWidth: 160, fontWeight: 700 }}
                >
                  <option value="">— {lang === 'mr' ? 'सर्व (जमा आणि नावे)' : 'All (Credit & Debit)'} —</option>
                  <option value="CREDIT">📥 {lang === 'mr' ? 'केवळ जमा पावत्या' : 'CREDIT Receipts Only'}</option>
                  <option value="DEBIT">📤 {lang === 'mr' ? 'केवळ नावे खर्च' : 'DEBIT Payments Only'}</option>
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'व्यवहाराचा प्रकार:' : 'Transaction Type:'}</span>
                <select
                  id="hist-type"
                  className="filter-select"
                  value={hTxnTypeId}
                  onChange={e => setHTxnTypeId(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  <option value="">— {lang === 'mr' ? 'सर्व प्रकार' : 'All Types'} —</option>
                  {txnTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {lang === 'mr' ? (TXN_HEAD_MAP_MR[t.name] || t.name) : t.name} ({t.entry_type === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (t.entry_type === 'CREDIT' ? (lang === 'mr' ? 'जमा' : 'CREDIT') : (lang === 'mr' ? 'जमा/नावे' : 'BOTH'))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">{lang === 'mr' ? 'स्थिती:' : 'Status:'}</span>
                <select
                  id="hist-status"
                  className="filter-select"
                  value={hStatus}
                  onChange={e => setHStatus(e.target.value)}
                >
                  <option value="">— {lang === 'mr' ? 'सर्व स्थिती' : 'All Statuses'} —</option>
                  <option value="POSTED">{lang === 'mr' ? 'केवळ पोस्ट केलेले' : 'Posted Only'}</option>
                  <option value="DRAFT">{lang === 'mr' ? 'केवळ मसुदे' : 'Drafts Only'}</option>
                </select>
              </div>

              <button className="btn btn-primary btn-sm" onClick={loadHistory} id="hist-refresh-btn">
                <RefreshCw size={14} /> {lang === 'mr' ? 'नोंदी शोधा' : 'Filter Records'}
              </button>
            </div>

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
                      <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'रक्कम (रु.पै)' : 'Amount (Rs.Ps)'}</th>
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
                              {txn.transaction_type?.name || '—'} ({nature === 'DEBIT' ? (lang === 'mr' ? 'नावे' : 'DEBIT') : (lang === 'mr' ? 'जमा' : 'CREDIT')})
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
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)' }}>
                            ₹ {totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                onClick={() => loadDraftIntoForm(txn)}
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
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: 'var(--blue-800)' }}>
                        ₹ {historyTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                            onClick={() => loadDraftIntoForm(d)}
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

      </div>
    </div>
  );
};

export default CreditAccountForm;
