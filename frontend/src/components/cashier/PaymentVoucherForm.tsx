import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Upload, Eye, Download, CreditCard, Banknote, Zap, Calendar, Search, Languages, FileText, Loader2, Table, List } from 'lucide-react';
import { fetchNextPaymentVoucherNo, createPaymentVoucher, updatePaymentVoucher, fetchPaymentVouchers, deletePaymentVoucher, uploadCashierReceipt, getFileUrl, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import InlineDocViewer from '../InlineDocViewer';

import type { CashPaymentVoucher, User, VoucherItemRow } from '../../types';
import { PAYMENT_PARTICULARS_OPTIONS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ITEM_TRANSLATIONS } from '../../i18n/translations';
import { translateToMarathi } from '../../utils/translator';
import SearchableCombobox from '../SearchableCombobox';


interface PaymentVoucherFormProps {
  user?: User | null;
}

const numberToWords = (num: number): string => {
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let str = inWords(rupees).trim() + ' Rupees';
  if (paise > 0) {
    str += ' and ' + inWords(paise).trim() + ' Paise';
  }
  return str + ' Only';
};

const PaymentVoucherForm: React.FC<PaymentVoucherFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [voucherNo, setVoucherNo] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today);
  const [bankName, setBankName] = useState('');
  const [receiptDocPath, setReceiptDocPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_cashier_payment_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleViewModeChange = (mode: 'excel' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('bgs_cashier_payment_view_mode', mode);
  };

  // Date Range Filters & Search
  const [startDateFilter, setStartDateFilter] = useState(thirtyDaysAgo);
  const [endDateFilter, setEndDateFilter] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  // Particulars list
  const [particularsOptions, setParticularsOptions] = useState<string[]>(PAYMENT_PARTICULARS_OPTIONS);

  // Multi-item addable rows with CGST and SGST
  const [items, setItems] = useState<VoucherItemRow[]>([
    { id: '1', particular: PAYMENT_PARTICULARS_OPTIONS[0], ref_no: '', amount: 0, cgst_rate: 0, sgst_rate: 0, total_amount: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<CashPaymentVoucher[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<CashPaymentVoucher | null>(null);

  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');

  useEffect(() => {
    if (!editingId) loadNextVoucherNo(date);
    loadHistory();
  }, [date, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (editParam && history.length > 0) {
      const numericId = parseInt(editParam);
      const match = history.find(h => h.id === numericId);
      if (match) {
        handleEdit(match);
      }
    }
  }, [editParam, history]);

  const loadNextVoucherNo = async (d: string) => {
    try {
      const res = await fetchNextPaymentVoucherNo(d);
      setVoucherNo(res.voucher_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchPaymentVouchers(startDateFilter, endDateFilter);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleTranslatePaidTo = async () => {
    if (!paidTo.trim()) return;
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      const tr = await translateToMarathi(paidTo);
      setPaidTo(tr);
      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'मराठीत भाषांतर यशस्वीरित्या पूर्ण झाले!' : 'Successfully translated to Marathi!'
      });
    } catch {
      setMsg({
        type: 'error',
        text: lang === 'mr' ? 'भाषांतर करताना अडचण आली.' : 'Translation failed.'
      });
    } finally {
      setTranslating(false);
    }
  };

  const handleEdit = (v: CashPaymentVoucher) => {
    setEditingId(v.id);
    setDate(v.date);
    setVoucherNo(v.voucher_no);
    setPaidTo(v.paid_to);
    setPurpose(v.purpose_remarks || '');
    setPaymentMode((v.payment_mode || 'CASH') as 'CASH' | 'CHEQUE');
    setChequeNo(v.cheque_no || '');
    setChequeDate(v.cheque_date || today);
    setBankName(v.bank_name || '');
    setReceiptDocPath(v.receipt_doc_path || '');
    setItems([
      {
        id: '1',
        particular: v.details_of_expenditure || PAYMENT_PARTICULARS_OPTIONS[0],
        ref_no: '',
        amount: Number(v.amount_rs) || 0,
        cgst_rate: 0,
        sgst_rate: 0,
        total_amount: Number(v.amount_rs) || 0
      }
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addCustomParticular = () => {
    const custom = window.prompt(lang === 'mr' ? 'नवीन बाबीचे नाव प्रविष्ट करा:' : 'Enter new payment particular name:');
    if (custom && custom.trim()) {
      const trimmed = custom.trim();
      if (!particularsOptions.includes(trimmed)) {
        setParticularsOptions([...particularsOptions, trimmed]);
      }
    }
  };

  // Item Row calculations
  const updateRow = (index: number, field: keyof VoucherItemRow, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    if (field === 'particular') {
      if (val === 'The Pioneer Urban Bank CA' || val === 'CA NO') {
        item.ref_no = '020523007720';
      } else if (val === 'The Pioneer Urban Bank CC' || val === 'CC No') {
        item.ref_no = '020522083249';
      }
    }

    const amt = parseFloat(String(item.amount)) || 0;
    const cgst = parseFloat(String(item.cgst_rate)) || 0;
    const sgst = parseFloat(String(item.sgst_rate)) || 0;

    const cgstVal = amt * (cgst / 100);
    const sgstVal = amt * (sgst / 100);
    item.total_amount = amt + cgstVal + sgstVal;

    updated[index] = item;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), particular: particularsOptions[0], ref_no: '', amount: 0, cgst_rate: 0, sgst_rate: 0, total_amount: 0 }
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const baseTotal = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cgstTotal = items.reduce((s, r) => s + ((Number(r.amount) || 0) * ((Number(r.cgst_rate) || 0) / 100)), 0);
  const sgstTotal = items.reduce((s, r) => s + ((Number(r.amount) || 0) * ((Number(r.sgst_rate) || 0) / 100)), 0);
  const grandTotal = baseTotal + cgstTotal + sgstTotal;
  const amountWords = numberToWords(grandTotal);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCashierReceipt(file);
      setReceiptDocPath(res.filepath);
      setMsg({ type: 'success', text: lang === 'mr' ? 'पेमेंट पावती अपलोड झाली!' : 'Payment receipt uploaded successfully!' });
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'फाइल अपलोड अपयशी ठरले.' : 'File upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setDate(today);
    setPaidTo('');
    setPurpose('');
    setPaymentMode('CASH');
    setChequeNo('');
    setChequeDate(today);
    setBankName('');
    setReceiptDocPath('');
    setItems([{ id: '1', particular: particularsOptions[0], ref_no: '', amount: 0, cgst_rate: 0, sgst_rate: 0, total_amount: 0 }]);
    setMsg(null);
    loadNextVoucherNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidTo.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया रक्कम कोणाला दिली ते नाव प्रविष्ट करा.' : 'Please enter Paid To name.' });
      return;
    }
    if (grandTotal <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया किमान एका बाबीची रक्कम प्रविष्ट करा.' : 'Please enter amount for at least one item.' });
      return;
    }

    const detailsStr = items.map((r, idx) => {
      const pName = lang === 'mr' ? (ITEM_TRANSLATIONS[r.particular] || r.particular) : r.particular;
      const ref = r.ref_no ? ` (${r.ref_no})` : '';
      const tax = (r.cgst_rate > 0 || r.sgst_rate > 0) ? ` [CGST:${r.cgst_rate}% + SGST:${r.sgst_rate}%]` : '';
      return `${idx + 1}. ${pName}${ref}: ₹${Number(r.amount).toFixed(2)}${tax} = ₹${Number(r.total_amount).toFixed(2)}`;
    }).join('\n');

    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        date,
        voucher_no: voucherNo,
        paid_to: paidTo.trim(),
        purpose_remarks: purpose.trim(),
        details_of_expenditure: detailsStr,
        amount_rs: grandTotal,
        amount_words: amountWords,
        receipt_doc_path: receiptDocPath || undefined,
        payment_mode: paymentMode,
        cheque_no: paymentMode === 'CHEQUE' ? chequeNo.trim() : undefined,
        cheque_date: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        bank_name: paymentMode === 'CHEQUE' ? bankName.trim() : undefined,
        created_by: user?.username || 'cashier',
      };

      if (editingId) {
        const updated = await updatePaymentVoucher(editingId, payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? `पेमेंट व्हाऊचर ${updated.voucher_no} अपडेट केले!` : `Payment Voucher ${updated.voucher_no} updated successfully!`
        });
      } else {
        const created = await createPaymentVoucher(payload);
        const modeNote = paymentMode === 'CHEQUE'
          ? (lang === 'mr' ? ' चेक बुकमध्ये स्वयंचलित नोंदवली (स्क्रोल बुकात दर्शविले जाणार नाही)!' : ' Auto-updated in Cheque Issue Book (Not shown in Cash Scroll)!')
          : (lang === 'mr' ? ' स्क्रोल पुस्तक (नावे/Paid) मध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book!');

        setMsg({
          type: 'success',
          text: (lang === 'mr' ? `पेमेंट व्हाऊचर ${created.voucher_no} जतन केले!` : `Payment Voucher ${created.voucher_no} saved!`) + modeNote
        });
        setSelectedVoucher(created);
      }

      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'व्हाऊचर जतन करताना त्रुटी आली.' : 'Error saving voucher.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे व्हाऊचर हटवायचे आहे का?' : 'Are you sure you want to delete this voucher?')) return;
    try {
      await deletePaymentVoucher(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (v: CashPaymentVoucher) => {
    setSelectedVoucher(v);
    setShowPrintModal(true);
  };

  return (
    <div>
      {/* Form Entry Card — Accountant Styled Layout */}
      <div className="card" style={{ borderTop: '4px solid #b91c1c', boxShadow: '0 4px 16px rgba(185, 28, 28, 0.08)', marginBottom: 28 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#fef2f2', padding: 8, borderRadius: 8, color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {lang === 'mr' ? '१. रोख पेमेंट व्हाऊचर नोंद (Payment Voucher Entry)' : '1. Cash Payment Voucher Entry'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {lang === 'mr' ? '* चिन्हांकित सर्व रकाने अनिवार्य आहेत (स्क्रोल बुकात नावे/Paid नोंद होईल)' : '* All fields marked with * are required (Auto-posts to Cash Scroll Paid)'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                id="payment-excel-view-btn"
              >
                <Table size={14} /> {lang === 'mr' ? 'एक्सेल ग्रिड' : 'Excel Grid'}
              </button>
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
                id="payment-vertical-view-btn"
              >
                <List size={14} /> {lang === 'mr' ? 'उभी मांडणी' : 'Vertical Stack'}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={async () => {
                if (!window.confirm(lang === 'mr' ? 'मागील ३० दिवसांचा कॅशियर चाचणी डेटा तयार करायचा आहे का?' : 'Generate 30 days cashier test data?')) return;
                setLoading(true);
                try {
                  const res = await generate30DaysCashierTestData();
                  setMsg({
                    type: 'success',
                    text: (lang === 'mr' ? '३० दिवसांचा कॅशियर डेटा यशस्वीरित्या जोडला गेला! ' : 'Successfully generated 30 days cashier test data! ') + res.message
                  });
                  loadHistory();
                } catch {
                  setMsg({ type: 'error', text: lang === 'mr' ? 'चाचणी डेटा तयार करताना त्रुटी आली.' : 'Error generating test data.' });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Zap size={14} color="#d97706" />
              {lang === 'mr' ? '⚡ ३० दिवसांचा चाचणी डेटा' : '⚡ Generate 30 Days Data'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={async () => {
                if (!window.confirm(lang === 'mr' ? 'सर्व कॅशियर चाचणी डेटा हटवायचा आहे का?' : 'Delete generated cashier test data?')) return;
                setLoading(true);
                try {
                  const res = await delete30DaysCashierTestData();
                  setMsg({
                    type: 'success',
                    text: (lang === 'mr' ? 'सर्व चाचणी डेटा हटवला गेला! ' : 'Successfully deleted test data! ') + res.message
                  });
                  loadHistory();
                } catch {
                  setMsg({ type: 'error', text: lang === 'mr' ? 'चाचणी डेटा हटवताना त्रुटी आली.' : 'Error deleting test data.' });
                } finally {
                  setLoading(false);
                }
              }}
            >
              {lang === 'mr' ? '🗑️ चाचणी डेटा हटवा' : '🗑️ Delete Test Data'}
            </button>
            {history.length > 0 && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
                <Printer size={14} /> {lang === 'mr' ? 'व्हाऊचर प्रिंट' : 'Print Voucher'}
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
              <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
            </button>
          </div>
        </div>

        <div className="card-body">
          {msg && (
            <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
              {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* MODE 1: EXCEL SPREADSHEET GRID VIEW (Vertically Aligned)       */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === 'excel' && (
              <div className="excel-form-container" style={{ marginBottom: 20, width: '100%' }}>
                <div className="excel-toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Table size={16} color="#059669" />
                    <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                      {lang === 'mr' ? 'रोख पेमेंट तपशील (एक्सेल ग्रिड)' : 'CASH_PAYMENT_ENTRY_SHEET (Excel Grid)'}
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
                      {/* Row 1: Voucher No */}
                      <tr>
                        <td className="excel-row-idx">1</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'व्हाऊचर क्र. (Voucher No.)' : 'Voucher No.'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} required style={{ maxWidth: 300, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{voucherNo}</span>
                        </td>
                      </tr>

                      {/* Row 2: Date */}
                      <tr>
                        <td className="excel-row-idx">2</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required style={{ maxWidth: 260, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{date}</span>
                        </td>
                      </tr>

                      {/* Row 3: Payment Mode */}
                      <tr>
                        <td className="excel-row-idx">3</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'पेमेंट प्रकार (Payment Mode)' : 'Payment Mode'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              <input type="radio" name="paymentModeExcel" value="CASH" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} />
                              <Banknote size={14} color="#16a34a" /> {lang === 'mr' ? 'रोख (Cash)' : 'Cash'}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              <input type="radio" name="paymentModeExcel" value="CHEQUE" checked={paymentMode === 'CHEQUE'} onChange={() => setPaymentMode('CHEQUE')} />
                              <CreditCard size={14} color="#2563eb" /> {lang === 'mr' ? 'चेक (Cheque)' : 'Cheque'}
                            </label>
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{paymentMode}</span>
                        </td>
                      </tr>

                      {/* Cheque Fields if CHEQUE */}
                      {paymentMode === 'CHEQUE' && (
                        <>
                          <tr>
                            <td className="excel-row-idx">3a</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'चेक क्र. (Cheque No.)' : 'Cheque No.'}</span>
                              <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                            </td>
                            <td className="excel-col-input">
                              <input type="text" className="form-input" placeholder="e.g. CHQ-48592" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ maxWidth: 300, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{chequeNo}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="excel-row-idx">3b</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'चेक दिनांक (Cheque Date)' : 'Cheque Date'}</span>
                            </td>
                            <td className="excel-col-input">
                              <input type="date" className="form-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} style={{ maxWidth: 260, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{chequeDate}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="excel-row-idx">3c</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'बँकेचे नाव (Bank Name)' : 'Bank Name'}</span>
                            </td>
                            <td className="excel-col-input">
                              <input type="text" className="form-input" placeholder="e.g. BDCC Bank Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ maxWidth: 360, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{bankName}</span>
                            </td>
                          </tr>
                        </>
                      )}

                      {/* Row 4: Paid To */}
                      <tr>
                        <td className="excel-row-idx">4</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'पेमेंट दिले (Paid To)' : 'Paid To'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" placeholder={lang === 'mr' ? 'ज्या व्यक्तीस/संस्थेस रोख दिले त्यांचे नाव' : 'Name of person / entity paid to'} value={paidTo} onChange={e => setPaidTo(e.target.value)} required style={{ maxWidth: 420, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <button
                            type="button"
                            onClick={handleTranslatePaidTo}
                            disabled={translating}
                            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                          >
                            {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                            {translating ? (lang === 'mr' ? 'भाषांतर होत आहे...' : 'Translating...') : (lang === 'mr' ? 'मराठीत भाषांतर' : 'Translate')}
                          </button>
                        </td>
                      </tr>

                      {/* Row 5: Purpose / Remarks */}
                      <tr>
                        <td className="excel-row-idx">5</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'हेतू / रिमार्क्स (Purpose / Remarks)' : 'Purpose / Remarks'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" placeholder={lang === 'mr' ? 'उदा. दैनिक मजुरी, बियाणे खरेदी, विधी फी इ.' : 'e.g. Daily wages, seed purchase, legal fee'} value={purpose} onChange={e => setPurpose(e.target.value)} style={{ maxWidth: 420, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{purpose}</span>
                        </td>
                      </tr>

                      {/* Dynamic Expenditure Items Rows in Excel Grid */}
                      {items.map((row, idx) => (
                        <React.Fragment key={row.id}>
                          {/* Row: Particulars */}
                          <tr>
                            <td className="excel-row-idx">{items.length > 1 ? `6.${idx + 1}a` : '6'}</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? (items.length > 1 ? `खर्च बाब #${idx + 1} (Particular #${idx + 1})` : 'खर्चाचा तपशील (Particulars)') : (items.length > 1 ? `Expenditure Item #${idx + 1}` : 'Particulars')}</span>
                              <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                            </td>
                            <td className="excel-col-input">
                              <div style={{ maxWidth: 420 }}>
                                <SearchableCombobox
                                  value={row.particular}
                                  onChange={val => updateRow(idx, 'particular', val)}
                                  options={particularsOptions}
                                  onAddNewOption={newOpt => {
                                    if (!particularsOptions.includes(newOpt)) {
                                      setParticularsOptions([...particularsOptions, newOpt]);
                                    }
                                  }}
                                  lang={lang}
                                  itemTranslations={ITEM_TRANSLATIONS}
                                />
                              </div>
                            </td>
                            <td className="excel-col-tools">
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={addCustomParticular}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}
                                >
                                  + {lang === 'mr' ? 'कस्टम' : 'Custom'}
                                </button>
                                <button
                                  type="button"
                                  onClick={addRow}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: 11, padding: '3px 8px', fontWeight: 600 }}
                                >
                                  + {lang === 'mr' ? 'ओळ' : 'Row'}
                                </button>
                                {items.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removeRow(idx)}
                                    style={{ padding: '3px 6px' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Row: Ref / Account No */}
                          <tr>
                            <td className="excel-row-idx">{items.length > 1 ? `6.${idx + 1}b` : '7'}</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'संदर्भ / खाते क्र. (Ref / A/c No.)' : 'Ref / Account No.'}</span>
                            </td>
                            <td className="excel-col-input">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Ref/Loan/A/c No"
                                value={row.ref_no || ''}
                                onChange={e => updateRow(idx, 'ref_no', e.target.value)}
                                style={{ maxWidth: 260, height: 38 }}
                              />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{row.ref_no || 'Ref/Loan No'}</span>
                            </td>
                          </tr>

                          {/* Row: Amount */}
                          <tr>
                            <td className="excel-row-idx">{items.length > 1 ? `6.${idx + 1}c` : '8'}</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'रक्कम ₹ (Amount)' : 'Amount (₹)'}</span>
                              <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                            </td>
                            <td className="excel-col-input">
                              <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                style={{ maxWidth: 220, height: 38, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}
                                value={row.amount || ''}
                                onChange={e => updateRow(idx, 'amount', e.target.value)}
                                placeholder="0.00"
                                required
                              />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>
                                ₹{Number(row.amount || 0).toFixed(2)}
                              </span>
                            </td>
                          </tr>

                          {/* Row: CGST & SGST */}
                          <tr>
                            <td className="excel-row-idx">{items.length > 1 ? `6.${idx + 1}d` : '9'}</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'जीएसटी कर (CGST % / SGST %)' : 'GST Tax (CGST % / SGST %)'}</span>
                            </td>
                            <td className="excel-col-input">
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>CGST:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  value={row.cgst_rate || ''}
                                  onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                                  placeholder="0"
                                  style={{ width: 80, height: 36 }}
                                /> %
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginLeft: 8 }}>SGST:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  value={row.sgst_rate || ''}
                                  onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                                  placeholder="0"
                                  style={{ width: 80, height: 36 }}
                                /> %
                              </div>
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                Item Total: ₹{Number(row.total_amount || 0).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}

                      {/* Row 10: Calculations Summary */}
                      <tr>
                        <td className="excel-row-idx">10</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'एकूण बेरीज व कर (Total & Tax Summary)' : 'Total & Tax Summary'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', maxWidth: 600 }}>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, marginBottom: 6 }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Base Total: </span>
                                <strong>₹{baseTotal.toFixed(2)}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Total CGST: </span>
                                <strong>₹{cgstTotal.toFixed(2)}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Total SGST: </span>
                                <strong>₹{sgstTotal.toFixed(2)}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Grand Total: </span>
                                <strong style={{ fontSize: 16, color: '#dc2626' }}>₹{grandTotal.toFixed(2)}</strong>
                              </div>
                            </div>
                            {amountWords && (
                              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                <strong>{lang === 'mr' ? 'अक्षरी रक्कम:' : 'In Words:'}</strong> {amountWords}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 800 }}>Total Payable</span>
                        </td>
                      </tr>

                      {/* Row 11: Payment Receipt Upload */}
                      <tr>
                        <td className="excel-row-idx">11</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'पेमेंट पावती (Payment Receipt)' : 'Payment Receipt Upload'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              style={{ fontSize: 13, maxWidth: 320 }}
                            />
                            {uploading && <Loader2 size={16} className="spinner" />}
                            {receiptDocPath && (
                              <InlineDocViewer
                                docPath={receiptDocPath}
                                title={lang === 'mr' ? 'अपलोड केलेली पावती' : 'Uploaded Payment Receipt'}
                                buttonText={lang === 'mr' ? 'अपलोड केलेली पावती पाहा' : 'View Uploaded Receipt'}
                              />
                            )}
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            {receiptDocPath ? 'Attached' : 'Optional Scanned Doc'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* MODE 2: VERTICAL STACK VIEW (Clean One Below Another)          */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {viewMode === 'vertical' && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Row 1: Voucher No */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'व्हाऊचर क्र. (Voucher No.):' : 'Voucher No.:'} <span className="required">*</span>
                    </label>
                    <input type="text" className="form-input" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} required style={{ width: '100%', maxWidth: 300, height: 38 }} />
                  </div>

                  {/* Row 2: Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'दिनांक (Date):' : 'Date:'} <span className="required">*</span>
                    </label>
                    <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', maxWidth: 260, height: 38 }} />
                  </div>

                  {/* Row 3: Payment Mode */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'पेमेंट प्रकार (Payment Mode):' : 'Payment Mode:'} <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input type="radio" name="paymentModeVert" value="CASH" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} />
                        <Banknote size={14} color="#16a34a" /> {lang === 'mr' ? 'रोख (Cash)' : 'Cash'}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input type="radio" name="paymentModeVert" value="CHEQUE" checked={paymentMode === 'CHEQUE'} onChange={() => setPaymentMode('CHEQUE')} />
                        <CreditCard size={14} color="#2563eb" /> {lang === 'mr' ? 'चेक (Cheque)' : 'Cheque'}
                      </label>
                    </div>
                  </div>

                  {/* Cheque Fields if CHEQUE */}
                  {paymentMode === 'CHEQUE' && (
                    <div style={{ background: '#f0f9ff', padding: 14, borderRadius: 8, border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 200, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'चेक क्र. (Cheque No.):' : 'Cheque No.:'} <span className="required">*</span>
                        </label>
                        <input type="text" className="form-input" placeholder="e.g. CHQ-48592" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ width: '100%', maxWidth: 300, height: 38 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 200, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'चेक दिनांक (Cheque Date):' : 'Cheque Date:'}
                        </label>
                        <input type="date" className="form-input" value={chequeDate} onChange={e => setChequeDate(e.target.value)} style={{ width: '100%', maxWidth: 260, height: 38 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 200, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'बँकेचे नाव (Bank Name):' : 'Bank Name:'}
                        </label>
                        <input type="text" className="form-input" placeholder="e.g. BDCC Bank Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: '100%', maxWidth: 360, height: 38 }} />
                      </div>
                    </div>
                  )}

                  {/* Row 4: Paid To */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 220, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {lang === 'mr' ? 'पेमेंट दिले (Paid To):' : 'Paid To:'} <span className="required">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleTranslatePaidTo}
                        disabled={translating}
                        style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                      >
                        {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                        {translating ? (lang === 'mr' ? '...' : '...') : (lang === 'mr' ? 'मराठी' : 'Translate')}
                      </button>
                    </div>
                    <input type="text" className="form-input" placeholder={lang === 'mr' ? 'ज्या व्यक्तीस/संस्थेस रोख दिले त्यांचे नाव' : 'Name of person / entity paid to'} value={paidTo} onChange={e => setPaidTo(e.target.value)} required style={{ width: '100%', maxWidth: 420, height: 38 }} />
                  </div>

                  {/* Row 5: Purpose / Remarks */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'हेतू / रिमार्क्स:' : 'Purpose / Remarks:'}
                    </label>
                    <input type="text" className="form-input" placeholder={lang === 'mr' ? 'उदा. दैनिक मजुरी, बियाणे खरेदी, विधी फी इ.' : 'e.g. Daily wages, seed purchase, legal fee'} value={purpose} onChange={e => setPurpose(e.target.value)} style={{ width: '100%', maxWidth: 420, height: 38 }} />
                  </div>

                  {/* Expenditure Items in Vertical Mode */}
                  {items.map((row, idx) => (
                    <div key={row.id} style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          {lang === 'mr' ? `खर्च बाब #${idx + 1}` : `Expenditure Item #${idx + 1}`}
                        </strong>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={addCustomParticular}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}
                          >
                            + {lang === 'mr' ? 'कस्टम बाब' : 'Custom'}
                          </button>
                          <button
                            type="button"
                            onClick={addRow}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', fontWeight: 600 }}
                          >
                            + {lang === 'mr' ? 'ओळ जोडा' : 'Add Row'}
                          </button>
                          {items.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeRow(idx)}
                              style={{ padding: '3px 6px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Particular */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'तपशील खाते:' : 'Particulars:'} <span className="required">*</span>
                        </label>
                        <div style={{ width: '100%', maxWidth: 420 }}>
                          <SearchableCombobox
                            value={row.particular}
                            onChange={val => updateRow(idx, 'particular', val)}
                            options={particularsOptions}
                            onAddNewOption={newOpt => {
                              if (!particularsOptions.includes(newOpt)) {
                                setParticularsOptions([...particularsOptions, newOpt]);
                              }
                            }}
                            lang={lang}
                            itemTranslations={ITEM_TRANSLATIONS}
                          />
                        </div>
                      </div>

                      {/* Ref No */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'संदर्भ / खाते क्र.:' : 'Ref / Account No.:'}
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ref/Loan/A/c No"
                          value={row.ref_no || ''}
                          onChange={e => updateRow(idx, 'ref_no', e.target.value)}
                          style={{ width: '100%', maxWidth: 260, height: 38 }}
                        />
                      </div>

                      {/* Amount */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'रक्कम ₹ (Amount):' : 'Amount (₹):'} <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ width: '100%', maxWidth: 220, height: 38, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}
                          value={row.amount || ''}
                          onChange={e => updateRow(idx, 'amount', e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      {/* GST Rates */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'जीएसटी कर (CGST/SGST %):' : 'GST Rates (%):'}
                        </label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>CGST:</span>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={row.cgst_rate || ''}
                            onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                            placeholder="0"
                            style={{ width: 80, height: 36 }}
                          /> %
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>SGST:</span>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={row.sgst_rate || ''}
                            onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                            placeholder="0"
                            style={{ width: 80, height: 36 }}
                          /> %
                        </div>
                      </div>

                      {/* Item Total */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {lang === 'mr' ? 'बाब एकूण (Item Total):' : 'Item Total:'}
                        </label>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#dc2626', fontFamily: 'monospace' }}>
                          ₹{Number(row.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Calculations Summary */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b', paddingTop: 6 }}>
                      {lang === 'mr' ? 'एकूण बेरीज व कर:' : 'Total & Tax Summary:'}
                    </label>
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', flex: 1, maxWidth: 500 }}>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, marginBottom: 6 }}>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Base: </span><strong>₹{baseTotal.toFixed(2)}</strong></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>CGST: </span><strong>₹{cgstTotal.toFixed(2)}</strong></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>SGST: </span><strong>₹{sgstTotal.toFixed(2)}</strong></div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Grand Total: </span><strong style={{ fontSize: 16, color: '#dc2626' }}>₹{grandTotal.toFixed(2)}</strong></div>
                      </div>
                      {amountWords && (
                        <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          <strong>{lang === 'mr' ? 'अक्षरी रक्कम:' : 'In Words:'}</strong> {amountWords}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Receipt Upload in Vertical Mode */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'पेमेंट पावती अपलोड:' : 'Upload Payment Receipt:'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ fontSize: 13, maxWidth: 300 }}
                      />
                      {uploading && <Loader2 size={16} className="spinner" />}
                      {receiptDocPath && (
                        <InlineDocViewer
                          docPath={receiptDocPath}
                          title={lang === 'mr' ? 'अपलोड केलेली पावती' : 'Uploaded Payment Receipt'}
                          buttonText={lang === 'mr' ? 'अपलोड केलेली पावती पाहा' : 'View Uploaded Receipt'}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: editingId ? '#d97706' : undefined, borderColor: editingId ? '#d97706' : undefined }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : editingId ? (lang === 'mr' ? 'व्हाऊचर बदल जतन करा' : 'Update Voucher') : (lang === 'mr' ? 'जतन करा आणि व्यवहार पोस्ट करा' : 'Save & Post Transaction')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              setTranslating(true);
              setMsg({
                type: 'info',
                text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
              });
              try {
                if (paidTo) setPaidTo(await translateToMarathi(paidTo));
                if (purpose) setPurpose(await translateToMarathi(purpose));
                if (bankName) setBankName(await translateToMarathi(bankName));
                const updatedItems = await Promise.all(
                  items.map(async item => ({
                    ...item,
                    particular: await translateToMarathi(item.particular),
                  }))
                );
                setItems(updatedItems);
                setMsg({
                  type: 'success',
                  text: lang === 'mr' ? 'मराठीत भाषांतर यशस्वीरित्या पूर्ण झाले!' : 'Successfully translated to Marathi!'
                });
              } catch {
                setMsg({
                  type: 'error',
                  text: lang === 'mr' ? 'भाषांतर करताना अडचण आली.' : 'Translation failed.'
                });
              } finally {
                setTranslating(false);
              }
            }}
            disabled={translating || loading}
          >
            {translating ? (
              <>
                <Loader2 size={16} className="spinner" />
                {lang === 'mr' ? 'मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : 'Translating to Marathi, please wait...'}
              </>
            ) : (
              <>
                <Languages size={16} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>
    </div>
  </div>

      {/* History Register — General Ledger Styled Container */}
      {(() => {
        const filteredHistory = history.filter(h =>
          h.paid_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.voucher_no.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const totalAmount = filteredHistory.reduce((s, h) => s + (Number(h.amount_rs) || 0), 0);

        return (
          <div style={{ marginTop: 32 }}>
            {/* Filter Bar with clean alignment */}
            <div className="no-print" style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color="var(--blue-600)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'}</span>
                <input type="date" className="form-input" style={{ width: 140, height: 34, fontSize: 12 }} value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
                <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
                <input type="date" className="form-input" style={{ width: 140, height: 34, fontSize: 12 }} value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="var(--text-secondary)" />
                <input type="text" className="form-input" style={{ width: 240, height: 34, fontSize: 13 }} placeholder={lang === 'mr' ? 'शोधा (नाव, व्हाऊचर)...' : 'Search paid to, voucher...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center', fontWeight: 600 }}>
                {lang === 'mr' ? `${filteredHistory.length} नोंदी` : `${filteredHistory.length} entries`}
              </span>
            </div>

            {/* General Ledger Card Table */}
            <div className="card" style={{ borderTop: '4px solid #b91c1c', boxShadow: '0 4px 24px rgba(185, 28, 28, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {lang === 'mr' ? 'रोख पेमेंट व्हाऊचर नोंदवही' : 'Cash Payment Vouchers History'}
                </h4>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', background: '#fef2f2', padding: '4px 10px', borderRadius: 20, border: '1px solid #fecaca' }}>
                  {lang === 'mr' ? `एकूण नावे: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Total Paid: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <div className="table-wrapper">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-title">
                      {lang === 'mr' ? 'निवडलेल्या कालावधीत कोणत्याही नोंदी आढळल्या नाहीत' : 'No payment vouchers found for selected date range'}
                    </div>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>{lang === 'mr' ? 'व्हाऊचर क्र.' : 'Voucher No.'}</th>
                        <th style={{ width: 110 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                        <th>{lang === 'mr' ? 'पेमेंट दिले (Paid To)' : 'Paid To / Purpose'}</th>
                        <th style={{ width: 120 }}>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                        <th style={{ width: 100 }}>{lang === 'mr' ? 'पावती फाइल' : 'Receipt Doc'}</th>
                        <th style={{ textAlign: 'right', color: '#b91c1c', width: 140 }}>
                          {lang === 'mr' ? 'नावे रक्कम (Debit ₹)' : 'Amount (Debit ₹)'}
                        </th>
                        <th style={{ textAlign: 'center', width: 130 }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((row, idx) => (
                        <tr
                          key={row.id}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderLeft: '3px solid #b91c1c',
                          }}
                        >
                          <td style={{ fontWeight: 700, color: 'var(--text-brand)', fontFamily: 'monospace' }}>{row.voucher_no}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date}</td>
                          <td style={{ fontWeight: 600 }}>
                            {row.paid_to}
                            {row.purpose_remarks && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                {row.purpose_remarks}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${row.payment_mode === 'CHEQUE' ? 'badge-primary' : 'badge-secondary'}`}>
                              {row.payment_mode || 'CASH'} {row.cheque_no ? `(${row.cheque_no})` : ''}
                            </span>
                          </td>
                          <td>
                            {row.receipt_doc_path ? (
                              <InlineDocViewer
                                docPath={row.receipt_doc_path}
                                buttonText="Doc"
                                title={`Voucher ${row.voucher_no} - Receipt`}
                              />
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#b91c1c', fontSize: 14 }}>
                            ₹{Number(row.amount_rs).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Voucher">
                              <Edit size={13} /> {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 4 }} title="Print Voucher">
                              <Printer size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} title="Delete Voucher">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                        color: '#fff', fontWeight: 800, fontSize: 13,
                      }}>
                        <td colSpan={5} style={{ color: '#c7d2fe', padding: '10px 14px', fontWeight: 700 }}>
                          {lang === 'mr'
                            ? `एकूण पेमेंट व्हाऊचर्स (${filteredHistory.length} नोंदी)`
                            : `TOTAL PAYMENT VOUCHERS (${filteredHistory.length} entries)`}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fca5a5', fontSize: 14, fontWeight: 800 }}>
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable Voucher View */}
      {(showPrintModal || selectedVoucher) && selectedVoucher && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 700, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'व्हाऊचर पूर्वावलोकन व मुद्रण' : 'Voucher Preview & Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedVoucher(null); }}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Image #3 layout */}
            <div className="printable-voucher" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fafafa', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>
                  BELGAUM GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM
                </h2>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  CASH PAYMENT VOUCHER
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
                <div><strong>Voucher No.:</strong> {selectedVoucher.voucher_no}</div>
                <div><strong>Date:</strong> {selectedVoucher.date}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <div><strong>Paid To:</strong> {selectedVoucher.paid_to}</div>
                <div><strong>Payment Mode:</strong> {selectedVoucher.payment_mode || 'CASH'} {selectedVoucher.cheque_no ? `(Chq: ${selectedVoucher.cheque_no})` : ''}</div>
              </div>

              <div style={{ marginBottom: 10, fontSize: 14 }}>
                <strong>Purpose / Remarks:</strong> {selectedVoucher.purpose_remarks || 'N/A'}
              </div>

              <div style={{ fontStyle: 'italic', fontSize: 13, margin: '14px 0', padding: '8px 0', borderTop: '1px dashed #666', borderBottom: '1px dashed #666' }}>
                "I hereby acknowledge that I have received the cash amount mentioned below from the Society."
              </div>

              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 14 }}>Details of Expenditure:</strong>
                <div style={{ border: '1px solid #333', minHeight: 70, padding: 8, marginTop: 4, background: '#fff', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {selectedVoucher.details_of_expenditure || 'General Expense / Cash Payment'}
                </div>
              </div>

              {selectedVoucher.receipt_doc_path && (
                <div style={{ marginBottom: 14, fontSize: 12 }}>
                  <strong>Attached Payment Receipt:</strong> {selectedVoucher.receipt_doc_path}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
                <div>Amount (₹): ₹{Number(selectedVoucher.amount_rs).toFixed(2)}</div>
                <div>Total Amount (₹): ₹{Number(selectedVoucher.amount_rs).toFixed(2)}</div>
              </div>

              <div style={{ marginBottom: 24, fontSize: 14 }}>
                <strong>Amount in Words:</strong> {selectedVoucher.amount_words}
              </div>

              <div style={{ marginTop: 40, borderTop: '1px solid #000', paddingTop: 12 }}>
                <div style={{ marginBottom: 30, textAlign: 'right', fontSize: 13 }}>
                  <strong>Signature of Person Receiving Cash:</strong> ____________________
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
                  <div>Clerk<br /><br />__________</div>
                  <div>Accountant<br /><br />__________</div>
                  <div>Manager<br /><br />__________</div>
                  <div>Cashier<br /><br />__________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVoucherForm;
