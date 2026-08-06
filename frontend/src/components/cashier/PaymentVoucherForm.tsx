import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Upload, Eye, Download, CreditCard, Banknote, Zap, Calendar, Search, Languages, FileText, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!editingId) loadNextVoucherNo(date);
    loadHistory();
  }, [date, startDateFilter, endDateFilter]);

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
          ? (lang === 'mr' ? ' स्क्रोल पुस्तक व चेक बुकमध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book & Cheque Issue Book!')
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
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #dc2626', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#fee2e2', padding: 10, borderRadius: 8, color: '#991b1b' }}>
            <FileText size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              1. {lang === 'mr' ? 'रोख पेमेंट व्हाऊचर (Payment Voucher)' : 'Cash Payment Voucher (Payment Voucher)'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'रोख/चेक पेमेंट व्हाऊचर नोंदवा (स्क्रोल पुस्तक व चेक बुकमध्ये ऑटो-अपडेट होईल)' : 'Record payment voucher (Auto-posts to Cash Scroll & Cheque Issue Book)'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            {lang === 'mr' ? '⚡ ३० दिवसांचा चाचणी डेटा जोडा' : '⚡ Generate 30 Days Test Data'}
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
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
              <Printer size={14} /> {lang === 'mr' ? 'व्हाऊचर प्रिंट करा' : 'Print Voucher'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'व्हाऊचर क्र. (Voucher No.)' : 'Voucher No.'}</label>
            <input type="text" className="form-input" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>{lang === 'mr' ? 'पेमेंट दिले (Paid To)' : 'Paid To'}</label>
              <button
                type="button"
                onClick={handleTranslatePaidTo}
                disabled={translating}
                style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
              >
                {translating ? <Loader2 size={13} className="spinner" /> : <Languages size={13} />}
                {translating ? (lang === 'mr' ? 'प्रक्रिया सुरू आहे...' : 'Translating...') : (lang === 'mr' ? 'मराठीत भाषांतर करा' : 'Translate to Marathi')}
              </button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'ज्या व्यक्तीस/संस्थेस रोख दिले त्यांचे नाव' : 'Name of person / entity paid to'}
              value={paidTo}
              onChange={e => setPaidTo(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Payment Mode (CASH vs CHEQUE) */}
        <div style={{ background: '#f1f5f9', padding: 14, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
            {lang === 'mr' ? 'पेमेंट प्रकार (Payment Mode):' : 'Payment Mode:'}
          </label>
          <div style={{ display: 'flex', gap: 20, marginBottom: paymentMode === 'CHEQUE' ? 12 : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentMode"
                value="CASH"
                checked={paymentMode === 'CASH'}
                onChange={() => setPaymentMode('CASH')}
              />
              <Banknote size={16} color="#16a34a" />
              {lang === 'mr' ? 'रोख (Cash) → स्क्रोल बुकात (Paid) नोंद होईल' : 'Cash → Updates Cash Scroll (Paid)'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="radio"
                name="paymentMode"
                value="CHEQUE"
                checked={paymentMode === 'CHEQUE'}
                onChange={() => setPaymentMode('CHEQUE')}
              />
              <CreditCard size={16} color="#2563eb" />
              {lang === 'mr' ? 'चेक (Cheque) → स्क्रोल व चेक बुकमध्ये ऑटो-अपडेट' : 'Cheque → Updates Scroll & Cheque Book'}
            </label>
          </div>

          {paymentMode === 'CHEQUE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'चेक क्र. (Cheque No.)' : 'Cheque No.'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CHQ-48592"
                  value={chequeNo}
                  onChange={e => setChequeNo(e.target.value)}
                  required={paymentMode === 'CHEQUE'}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'चेक दिनांक' : 'Cheque Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={chequeDate}
                  onChange={e => setChequeDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'बँकेचे नाव' : 'Bank Name'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BDCC Bank Belgaum"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">{lang === 'mr' ? 'हेतू / रिमार्क्स (Purpose / Remarks)' : 'Purpose / Remarks'}</label>
          <input
            type="text"
            className="form-input"
            placeholder={lang === 'mr' ? 'उदा. दैनिक मजुरी, बियाणे खरेदी, विधी फी इ.' : 'e.g. Daily wages, legal fee, seed purchase'}
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />
        </div>

        {/* Dynamic Expenditure Items Table with Dropdown and CGST/SGST */}
        <div style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {lang === 'mr' ? 'खर्चाचा तपशील व बाबी (Particulars Expenditure Items)' : 'Particulars Expenditure Items'}
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomParticular} style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}>
                ➕ {lang === 'mr' ? '+ नवीन बाब जोडा' : '+ Add Custom Particular'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
                <Plus size={14} /> {lang === 'mr' ? '+ बाब ओळ जोडा (Add Row)' : '+ Add Item Row'}
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>{lang === 'mr' ? 'तपशील खाते (Particulars)' : 'Particulars'}</th>
                  <th style={{ width: 140 }}>{lang === 'mr' ? 'संदर्भ / खाते क्र.' : 'Ref / Account No.'}</th>
                  <th style={{ width: 120, textAlign: 'right' }}>{lang === 'mr' ? 'रक्कम ₹' : 'Amount (₹)'}</th>
                  <th style={{ width: 100 }}>{lang === 'mr' ? 'सीजीएसटी %' : 'CGST %'}</th>
                  <th style={{ width: 100 }}>{lang === 'mr' ? 'एसजीएसटी %' : 'SGST %'}</th>
                  <th style={{ width: 130, textAlign: 'right' }}>{lang === 'mr' ? 'एकूण ₹' : 'Item Total (₹)'}</th>
                  <th style={{ width: 50, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td style={{ minWidth: 220 }}>
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
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ref/Loan/A/c No"
                        value={row.ref_no || ''}
                        onChange={e => updateRow(idx, 'ref_no', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ textAlign: 'right' }}
                        value={row.amount || ''}
                        onChange={e => updateRow(idx, 'amount', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={row.cgst_rate || ''}
                        onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={row.sgst_rate || ''}
                        onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      ₹{Number(row.total_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(idx)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Base Total:</span>
              <div style={{ fontWeight: 600 }}>₹{baseTotal.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Total CGST:</span>
              <div style={{ fontWeight: 600 }}>₹{cgstTotal.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Total SGST:</span>
              <div style={{ fontWeight: 600 }}>₹{sgstTotal.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Grand Total:</span>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#dc2626' }}>₹{grandTotal.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
            <strong>{lang === 'mr' ? 'अक्षरी रक्कम:' : 'In Words:'}</strong> {amountWords}
          </div>
        </div>

        {/* Payment Receipt Document Upload Section */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Upload size={16} color="var(--blue-600)" />
            {lang === 'mr' ? 'पेमेंट पावती / व्हाऊचर फाइल अपलोड करा (Payment Receipt Upload)' : 'Upload Payment Receipt / Scanned Document'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ fontSize: 13 }}
            />
            {uploading && <span className="spinner" />}
            {receiptDocPath && (
              <InlineDocViewer
                docPath={receiptDocPath}
                title={lang === 'mr' ? 'अपलोड केलेली पावती' : 'Uploaded Payment Receipt'}
                buttonText={lang === 'mr' ? 'अपलोड केलेली पावती पाहा' : 'View Uploaded Receipt'}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: editingId ? '#d97706' : undefined, borderColor: editingId ? '#d97706' : undefined }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : editingId ? (lang === 'mr' ? 'व्हाऊचर बदल जतन करा' : 'Update Voucher') : (lang === 'mr' ? 'व्हाऊचर जतन करा' : 'Save Voucher')}
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

      {/* History Register */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {lang === 'mr' ? 'रोख पेमेंट व्हाऊचर नोंदवही' : 'Cash Payment Vouchers History'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="var(--blue-600)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'}</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
            <span style={{ fontSize: 12 }}>to</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
            <Search size={14} color="var(--text-secondary)" style={{ marginLeft: 8 }} />
            <input type="text" className="form-input" style={{ width: 160, padding: '3px 6px', fontSize: 12 }} placeholder={lang === 'mr' ? 'शोधा...' : 'Search paid to, no...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {history.filter(h => h.paid_to.toLowerCase().includes(searchTerm.toLowerCase()) || h.voucher_no.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16, background: '#f8fafc', borderRadius: 6, textAlign: 'center' }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीत कोणत्याही नोंदी आढळल्या नाहीत.' : 'No payment vouchers found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>{lang === 'mr' ? 'व्हाऊचर क्र.' : 'Voucher No.'}</th>
                  <th>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th>{lang === 'mr' ? 'पेमेंट दिले' : 'Paid To'}</th>
                  <th>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                  <th>{lang === 'mr' ? 'पावती फाइल' : 'Receipt Doc'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'रक्कम ₹' : 'Amount (₹)'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .filter(h => h.paid_to.toLowerCase().includes(searchTerm.toLowerCase()) || h.voucher_no.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.voucher_no}</td>
                      <td>{row.date}</td>
                      <td>{row.paid_to}</td>
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
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>₹{Number(row.amount_rs).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Voucher">
                          <Edit size={13} /> {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 4 }} title="Print Voucher">
                          <Printer size={13} /> {lang === 'mr' ? 'व्हाऊचर' : 'Voucher'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} title="Delete Voucher">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
