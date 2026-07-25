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
} from '../api/client';
import type { OfficeMaster, TransactionType, Transaction, User, Customer } from '../types';

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
}

// ─── Component ───────────────────────────────────────────────────────────────
const CreditAccountForm: React.FC<CreditAccountFormProps> = ({ user, onLogout }) => {
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

  // History Filter states
  const [hStartDate, setHStartDate] = useState(firstOfMonthStr);
  const [hEndDate, setHEndDate] = useState(todayStr);
  const [hTxnTypeId, setHTxnTypeId] = useState('');
  const [hCustomerId, setHCustomerId] = useState('');
  const [hStatus, setHStatus] = useState('');
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

  // ── History total amount calculation ─────────────────────────────────────────
  const historyTotalAmount = historyList.reduce(
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
        setAlert({ type: 'success', msg: `Transaction posted successfully! Cash Memo: ${saved.cash_memo_no}` });
        setForm({ ...INITIAL_FORM, date: form.date, created_by: form.created_by });
        setRows([newRow()]);
        setEditingDraftId(null);
        refreshMemo(form.date);
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
        title="Credit-Debit Account Form"
        subtitle="Belagavi Gardeners Co-op Production Supply and Sale Society Ltd."
        level={1}
        showPrint={!!savedMemo}
        user={user}
        onLogout={onLogout}
      />

      <div className="page-content">

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
            Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.<br />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Belagavi, Karnataka</span>
          </div>
          <div className="static-grid">
            <div className="static-field">
              <label><Hash size={10} style={{ display: 'inline' }} /> GST Number</label>
              <span>{office?.gst_no ?? '—'}</span>
            </div>
            <div className="static-field">
              <label><CreditCard size={10} style={{ display: 'inline' }} /> Cash Memo No.</label>
              <div className="memo-badge" style={{ marginTop: 2 }}>
                <Hash size={12} /> {nextMemo}
              </div>
            </div>
            <div className="static-field">
              <label><Phone size={10} style={{ display: 'inline' }} /> Phone Numbers</label>
              <span>{office?.phone1 ?? '—'}{office?.phone2 ? ` / ${office.phone2}` : ''}</span>
            </div>
            <div className="static-field">
              <label><Building2 size={10} style={{ display: 'inline' }} /> Office Address</label>
              <span>{office?.address ?? 'Belagavi, Karnataka - 590001'}</span>
            </div>
          </div>
        </div>

        {/* ── Bill Form Card ── */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                Transaction Entry
                {editingDraftId && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px',
                    background: '#fef3c7', color: '#b45309',
                    border: '1px solid #fde68a', borderRadius: 12,
                  }}>
                    Editing #{editingDraftId}
                  </span>
                )}
              </div>
              <div className="card-subtitle">All fields marked with * are required</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDraftsModal(true)}
                id="view-drafts-btn"
              >
                <FolderOpen size={14} /> Saved Drafts ({drafts.length})
              </button>

              {savedMemo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="memo-badge">
                    <CheckCircle size={13} /> Last saved: {savedMemo}
                  </div>
                  {lastSavedTxn && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setPrintingTxn(lastSavedTxn)}
                      id="print-last-saved-btn"
                    >
                      <Printer size={14} /> Print Bill Receipt
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
                  <label className="form-label">Date <span className="required">*</span></label>
                  <input id="txn-date" type="date" className="form-input"
                    value={form.date} onChange={handleChange('date')} required />
                </div>

                {/* Customer ID */}
                <div className="form-group">
                  <label className="form-label">10-Digit Customer ID / Account No.</label>
                  <input
                    id="customer-id"
                    type="text"
                    list="saved-customers-list"
                    className="form-input"
                    placeholder="Search/Select 10-Digit ID (e.g. 1000000001)"
                    value={form.customer_id}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, customer_id: val }));
                      // Find matching customer in customerList
                      const match = customerList.find(c => c.customer_id === val || c.full_name === val);
                      if (match) {
                        setForm(prev => ({
                          ...prev,
                          customer_id: match.customer_id,
                          salutation: match.salutation || 'Mr.',
                          customer_name: `${match.first_name}${match.middle_name ? ' ' + match.middle_name : ''} ${match.last_name}`.trim(),
                        }));
                        setAlert({ type: 'success', msg: `Auto-filled customer: ${match.full_name}` });
                      }
                    }}
                  />
                  <datalist id="saved-customers-list">
                    {customerList.map(c => (
                      <option key={c.id} value={c.customer_id}>
                        {c.full_name} ({c.mobile_no || 'No Mobile'})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Accountant */}
                <div className="form-group">
                  <label className="form-label">Accountant Name</label>
                  <input id="created-by" type="text" className="form-input"
                    placeholder="Accountant / clerk name"
                    value={form.created_by} onChange={handleChange('created_by')} />
                </div>

                {/* Customer Name */}
                <div className="form-group full-width">
                  <label className="form-label">Mr. / Mrs. Name <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select id="salutation" className="form-select"
                      style={{ width: 90, flexShrink: 0 }}
                      value={form.salutation} onChange={handleChange('salutation')}>
                      <option>Mr.</option><option>Mrs.</option><option>Ms.</option>
                      <option>Dr.</option><option>Sri.</option><option>Smt.</option>
                    </select>
                    <input id="customer-name" type="text" className="form-input"
                      placeholder="Full name of account holder"
                      value={form.customer_name} onChange={handleChange('customer_name')} required />
                  </div>
                </div>

                {/* ── 1. Transaction Type + Remarks ── */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Transaction Type <span className="required">*</span></span>
                    {form.transaction_type_id && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                        background: form.entry_nature === 'CREDIT' ? '#dcfce7' : '#fee2e2',
                        color: form.entry_nature === 'CREDIT' ? '#15803d' : '#b91c1c',
                        border: form.entry_nature === 'CREDIT' ? '1px solid #86efac' : '1px solid #fca5a5',
                      }}>
                        {form.entry_nature} ENTRY
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
                      let defaultNature: 'CREDIT' | 'DEBIT' = 'CREDIT';
                      if (selectedType) {
                        if (selectedType.entry_type === 'DEBIT') defaultNature = 'DEBIT';
                        else if (selectedType.entry_type === 'CREDIT') defaultNature = 'CREDIT';
                        else defaultNature = form.entry_nature || 'CREDIT';
                      }
                      setForm(prev => ({
                        ...prev,
                        transaction_type_id: selectedId,
                        entry_nature: defaultNature,
                      }));
                    }}
                    required
                  >
                    <option value="">— Select Type —</option>
                    {txnTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.entry_type || 'CREDIT'})
                      </option>
                    ))}
                  </select>

                  {/* Configurable Credit / Debit selector for Sundry Account / Both types */}
                  {(() => {
                    const selType = txnTypes.find(t => String(t.id) === form.transaction_type_id);
                    if (selType && selType.entry_type === 'BOTH') {
                      return (
                        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Entry Nature:</span>
                          <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="radio"
                              name="entry_nature"
                              value="CREDIT"
                              checked={form.entry_nature === 'CREDIT'}
                              onChange={() => setForm(prev => ({ ...prev, entry_nature: 'CREDIT' }))}
                            />
                            Credit Book (Receipt)
                          </label>
                          <label style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="radio"
                              name="entry_nature"
                              value="DEBIT"
                              checked={form.entry_nature === 'DEBIT'}
                              onChange={() => setForm(prev => ({ ...prev, entry_nature: 'DEBIT' }))}
                            />
                            Debit Book (Payment)
                          </label>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input id="remarks" type="text" className="form-input"
                    placeholder="Optional remarks"
                    value={form.remarks} onChange={handleChange('remarks')} />
                </div>

              </div>{/* /form-grid */}

              {/* ── 2. Particulars Grid ── */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Particulars <span className="required">*</span>
                  </label>
                  <button type="button" className="btn btn-primary btn-sm"
                    onClick={addRow} id="add-particular-btn">
                    <PlusCircle size={14} /> Add Item
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: colGrid,
                    background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                    padding: '8px 12px', borderBottom: '1px solid var(--border-muted)',
                  }}>
                    <ColHeader label="Particular / Item Description" />
                    <ColHeader label="Rs." align="right" />
                    <ColHeader label="Ps." align="right" />
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
                          placeholder={`Item ${idx + 1} description`}
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
                          id={`remove-row-${idx}`} title="Remove item"
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
                      SUB-TOTAL ({rows.length} item{rows.length !== 1 ? 's' : ''})
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
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>CGST</span>
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
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>SGST</span>
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
                      Grand Total
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
                <label className="form-label">Received Amount (in Words)</label>
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
                    ₹ IN WORDS:
                  </span>
                  <span id="amount-in-words" style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: grandTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontStyle: grandTotal > 0 ? 'normal' : 'italic',
                    flex: 1,
                  }}>
                    {grandTotal > 0 ? amountInWords : 'Enter particulars to auto-calculate…'}
                  </span>
                </div>
              </div>

              {/* ── Bill Footer ── */}
              <div className="bill-footer" style={{ marginTop: 24 }}>
                <div className="signature-block">
                  <div className="signature-line" />
                  <div className="signature-label">Signature of Account Holder</div>
                </div>
                <div className="signature-block">
                  <div className="signature-line" />
                  <div className="signature-label">Accountant</div>
                </div>
                <div className="total-amount-box">
                  <div className="label">TOTAL AMOUNT</div>
                  <div className="value">
                    ₹ {grandRs.toLocaleString('en-IN')}.{String(grandPs).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }} className="no-print">
                <button type="button" className="btn btn-secondary" onClick={handleReset} id="reset-btn">
                  <RotateCcw size={15} /> Reset
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderColor: '#fde68a', color: '#b45309', background: '#fffbeb' }}
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  id="save-draft-btn"
                >
                  <FileEdit size={16} /> Save as Draft
                </button>

                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="save-btn">
                  {loading ? <span className="spinner" /> : <Save size={16} />}
                  {loading ? 'Posting…' : 'Save & Post Transaction'}
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
                <Table size={18} color="var(--blue-700)" /> Customer Period Search & Monthly Account Statement
              </div>
              <div className="card-subtitle">Search by Customer ID / Name for any period to view &amp; print complete monthly statement</div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowStatementModal(true)}
              disabled={historyList.length === 0}
              id="print-monthly-stmt-btn"
            >
              <Printer size={14} /> Print Customer Monthly Statement
            </button>
          </div>

          <div className="card-body">
            {/* Filter Bar */}
            <div className="filter-bar" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 20 }}>
              <div className="filter-group">
                <span className="filter-label">Customer ID / Name:</span>
                <input
                  id="hist-cust-id"
                  type="text"
                  className="filter-input"
                  placeholder="e.g. CUST-1001 or Name"
                  value={hCustomerId}
                  onChange={e => setHCustomerId(e.target.value)}
                  style={{ minWidth: 160 }}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">From Date:</span>
                <input
                  id="hist-start"
                  type="date"
                  className="filter-input"
                  value={hStartDate}
                  onChange={e => setHStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">To Date:</span>
                <input
                  id="hist-end"
                  type="date"
                  className="filter-input"
                  value={hEndDate}
                  onChange={e => setHEndDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">Transaction Type:</span>
                <select
                  id="hist-type"
                  className="filter-select"
                  value={hTxnTypeId}
                  onChange={e => setHTxnTypeId(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  <option value="">— All Types —</option>
                  {txnTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <select
                  id="hist-status"
                  className="filter-select"
                  value={hStatus}
                  onChange={e => setHStatus(e.target.value)}
                >
                  <option value="">— All Statuses —</option>
                  <option value="POSTED">Posted Only</option>
                  <option value="DRAFT">Drafts Only</option>
                </select>
              </div>

              <button className="btn btn-primary btn-sm" onClick={loadHistory} id="hist-refresh-btn">
                <RefreshCw size={14} /> Filter Records
              </button>
            </div>

            {/* Total Amount & Count Summary Banner */}
            <div className="stat-row" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <div className="stat-label" style={{ color: '#1e40af' }}>Total Records Found</div>
                <div className="stat-value" style={{ color: '#1d4ed8' }}>{historyList.length}</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderColor: '#93c5fd' }}>
                <div className="stat-label" style={{ color: '#1e40af' }}>Total Period Amount</div>
                <div className="stat-value" style={{ color: '#1d4ed8', fontSize: 22 }}>
                  ₹ {historyTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Table of Period Records */}
            <div className="table-wrapper">
              {hLoading ? (
                <div className="loading-overlay">
                  <span className="spinner" /> Loading period records…
                </div>
              ) : historyList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Filter /></div>
                  <div className="empty-state-title">No matching transactions found</div>
                  <div className="empty-state-sub">Try adjusting Customer ID, date range, or transaction type filter above</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Date</th>
                      <th>Cash Memo No.</th>
                      <th>Customer Name</th>
                      <th>Transaction Type</th>
                      <th>Particulars</th>
                      <th style={{ textAlign: 'right' }}>Amount (Rs.Ps)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map(txn => {
                      const totalAmt = Number(txn.amount_rs) + Number(txn.amount_ps) / 100;
                      return (
                        <tr key={txn.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue-700)' }}>
                            {txn.customer_id || '—'}
                          </td>
                          <td>{txn.date}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{txn.cash_memo_no}</td>
                          <td style={{ fontWeight: 600 }}>{txn.customer_name}</td>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-700)' }}>
                              {txn.transaction_type?.name || '—'}
                            </span>
                          </td>
                          <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>
                            {txn.particulars || '—'}
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
                              {txn.status || 'POSTED'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setPrintingTxn(txn)}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4 }}
                                title="Print Bill Receipt"
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => loadDraftIntoForm(txn)}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', padding: 4 }}
                                title="Edit Transaction"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(txn.id, txn.cash_memo_no)}
                                style={{ background: 'none', border: 'none', color: 'var(--red-600)', cursor: 'pointer', padding: 4 }}
                                title="Delete Transaction"
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
                      <td colSpan={6} style={{ fontWeight: 700 }}>PERIOD TOTAL ({historyList.length} Transactions)</td>
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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}>
            <div style={{
              background: '#ffffff', border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 700,
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FolderOpen size={18} color="var(--amber-500)" /> Saved Drafts ({drafts.length})
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
                    No saved drafts found. Use "Save as Draft" to store work in progress.
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
                            {d.customer_name || 'Unnamed Customer'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            Memo: {d.cash_memo_no} | Date: {d.date} | Particulars: {d.particulars || 'None'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-700)', marginTop: 4 }}>
                            ₹ {Number(d.amount_rs).toLocaleString('en-IN')}.{String(d.amount_ps).padStart(2, '0')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPrintingTxn(d)}
                            title="Print Bill Receipt"
                          >
                            <Printer size={14} /> Print
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => loadDraftIntoForm(d)}
                          >
                            Load Draft
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
