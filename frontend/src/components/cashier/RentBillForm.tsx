import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Banknote, CreditCard, Zap, Calendar, Search, Languages, Landmark, Loader2, Table, List } from 'lucide-react';
import { fetchNextRentInvoiceNo, createRentBill, updateRentBill, fetchRentBills, deleteRentBill, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import type { RentBill, User } from '../../types';

import { RENT_PARTICULARS_OPTIONS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi } from '../../utils/translator';

import { ITEM_TRANSLATIONS } from '../../i18n/translations';
import SearchableCombobox from '../SearchableCombobox';

interface RentBillFormProps {
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

const RentBillForm: React.FC<RentBillFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeGst, setConsigneeGst] = useState('');
  const [particularsOptions, setParticularsOptions] = useState<string[]>(RENT_PARTICULARS_OPTIONS);
  const [particularsSelect, setParticularsSelect] = useState(RENT_PARTICULARS_OPTIONS[0]);
  const [customParticulars, setCustomParticulars] = useState('');
  const [hsnSac, setHsnSac] = useState('997212');
  const [gstRate, setGstRate] = useState<number>(18);
  const [qty, setQty] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [per, setPer] = useState('Month');

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today);
  const [bankName, setBankName] = useState('');

  // Calculated fields
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [sgstAmount, setSgstAmount] = useState<number>(0);
  const [cgstAmount, setCgstAmount] = useState<number>(0);
  const [igstAmount, setIgstAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxWords, setTaxWords] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_cashier_rent_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleViewModeChange = (mode: 'excel' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('bgs_cashier_rent_view_mode', mode);
  };

  // Date Filters & Search
  const [startDateFilter, setStartDateFilter] = useState(thirtyDaysAgo);
  const [endDateFilter, setEndDateFilter] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<RentBill[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RentBill | null>(null);

  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');

  useEffect(() => {
    if (!editingId) loadNextInvoiceNo(date);
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

  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    const base = q * r;
    setBaseAmount(base);

    const sgst = base * 0.09;
    const cgst = base * 0.09;
    setSgstAmount(sgst);
    setCgstAmount(cgst);
    setIgstAmount(0);

    const grand = base + sgst + cgst;
    setTotalAmount(grand);
    setTaxWords(numberToWords(grand));
  }, [qty, rate, gstRate]);

  const loadNextInvoiceNo = async (d: string) => {
    try {
      const res = await fetchNextRentInvoiceNo(d);
      setInvoiceNo(res.invoice_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchRentBills(startDateFilter, endDateFilter);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleTranslateConsignee = async () => {
    if (!consigneeName.trim()) return;
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      const tr = await translateToMarathi(consigneeName);
      setConsigneeName(tr);
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

  const handleEdit = (b: RentBill) => {
    setEditingId(b.id);
    setDate(b.date);
    setInvoiceNo(b.invoice_no);
    setConsigneeName(b.consignee_name);
    setConsigneeAddress(b.consignee_address || '');
    setParticularsSelect(particularsOptions[0]);
    setCustomParticulars(b.particulars || '');
    setHsnSac(b.hsn_sac || '997212');
    setQty(String(b.qty || 1));
    setRate(String(b.rate || ''));
    setPaymentMode((b.payment_mode || 'CASH') as 'CASH' | 'CHEQUE');
    setChequeNo(b.cheque_no || '');
    setChequeDate(b.cheque_date || today);
    setBankName(b.bank_name || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addCustomParticular = () => {
    const custom = window.prompt(lang === 'mr' ? 'नवीन बाबीचे नाव प्रविष्ट करा:' : 'Enter new rent particular name:');
    if (custom && custom.trim()) {
      const trimmed = custom.trim();
      if (!particularsOptions.includes(trimmed)) {
        setParticularsOptions([...particularsOptions, trimmed]);
        setParticularsSelect(trimmed);
      }
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setDate(today);
    setConsigneeName('');
    setConsigneeAddress('');
    setParticularsSelect(particularsOptions[0]);
    setCustomParticulars('');
    setRate('');
    setPaymentMode('CASH');
    setChequeNo('');
    setChequeDate(today);
    setBankName('');
    setMsg(null);
    loadNextInvoiceNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consigneeName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया भाडेकरू / ग्राहक नाव प्रविष्ट करा.' : 'Please enter Consignee / Rentee Name.' });
      return;
    }
    if (baseAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'अमान्य भाडे रक्कम.' : 'Invalid Rent Rate / Amount.' });
      return;
    }

    const finalParticulars = customParticulars.trim()
      ? `${particularsSelect} - ${customParticulars.trim()}`
      : particularsSelect;

    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        date,
        invoice_no: invoiceNo,
        consignee_name: consigneeName.trim(),
        consignee_address: consigneeAddress.trim(),
        particulars: finalParticulars,
        hsn_sac: hsnSac,
        gst_rate: gstRate,
        qty: parseFloat(qty) || 1,
        rate: parseFloat(rate) || 0,
        per,
        amount: baseAmount,
        igst_amount: igstAmount,
        sgst_amount: sgstAmount,
        cgst_amount: cgstAmount,
        total_amount: totalAmount,
        tax_amount_words: taxWords,
        payment_mode: paymentMode,
        cheque_no: paymentMode === 'CHEQUE' ? chequeNo.trim() : undefined,
        cheque_date: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        bank_name: paymentMode === 'CHEQUE' ? bankName.trim() : undefined,
        created_by: user?.username || 'cashier',
      };

      if (editingId) {
        const updated = await updateRentBill(editingId, payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? `भाडे बिल ${updated.invoice_no} अपडेट केले!` : `Rent Bill ${updated.invoice_no} updated successfully!`
        });
      } else {
        const created = await createRentBill(payload);
        const modeNote = paymentMode === 'CHEQUE'
          ? (lang === 'mr' ? ' स्क्रोल पुस्तक व चेक बुकमध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll & Cheque Book!')
          : (lang === 'mr' ? ' स्क्रोल पुस्तक (जमा/Received) मध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book!');

        setMsg({
          type: 'success',
          text: (lang === 'mr' ? `भाडे बिल टॅक्स इनव्हॉईस ${created.invoice_no} जतन केले!` : `Rent Bill Tax Invoice ${created.invoice_no} saved!`) + modeNote
        });
        setSelectedBill(created);
      }

      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'भाडे बिल जतन करताना त्रुटी आली.' : 'Error saving rent bill.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे भाडे बिल हटवायचे आहे का?' : 'Are you sure you want to delete this rent bill?')) return;
    try {
      await deleteRentBill(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (b: RentBill) => {
    setSelectedBill(b);
    setShowPrintModal(true);
  };

  return (
    <div>
      {/* Form Entry Card — Accountant Styled Layout */}
      <div className="card" style={{ borderTop: '4px solid #7c3aed', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.08)', marginBottom: 28 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#f3e8ff', padding: 8, borderRadius: 8, color: '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editingId
                  ? (lang === 'mr' ? '३. भाडे बिल सुधारणा (Edit Rent Bill)' : '3. Edit Rent Bill')
                  : (lang === 'mr' ? '३. भाडे बिल व कर इनव्हॉईस (Rent Bill & Tax Invoice)' : '3. Rent Bill & Tax Invoice')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {lang === 'mr' ? 'गाळा व व्यापारी गाळे भाडे, जीएसटी कर इनव्हॉईस आणि भाडे वसुली नोंदणी' : 'Stall/Shop Rent Tax Invoice generation with auto-calculated GST (9% CGST + 9% SGST)'}
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
                id="rent-excel-view-btn"
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
                id="rent-vertical-view-btn"
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
                <Printer size={14} /> {lang === 'mr' ? 'भाडे बिल प्रिंट' : 'Print Invoice'}
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
                      {lang === 'mr' ? 'भाडे बिल टॅक्स इनव्हॉईस तपशील (एक्सेल ग्रिड)' : 'RENT_INVOICE_ENTRY_SHEET (Excel Grid)'}
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
                      {/* Row 1: Invoice No */}
                      <tr>
                        <td className="excel-row-idx">1</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No.)' : 'Invoice No.'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required style={{ maxWidth: 300, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{invoiceNo}</span>
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
                          <span>{lang === 'mr' ? 'भाडे स्वीकार प्रकार (Payment Mode)' : 'Payment Mode'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              <input type="radio" name="paymentModeRentExcel" value="CASH" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} />
                              <Banknote size={14} color="#16a34a" /> {lang === 'mr' ? 'रोख (Cash)' : 'Cash'}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                              <input type="radio" name="paymentModeRentExcel" value="CHEQUE" checked={paymentMode === 'CHEQUE'} onChange={() => setPaymentMode('CHEQUE')} />
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
                              <input type="text" className="form-input" placeholder="e.g. CHQ-77201" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ maxWidth: 300, height: 38 }} />
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
                              <input type="text" className="form-input" placeholder="e.g. SBI Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ maxWidth: 360, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{bankName}</span>
                            </td>
                          </tr>
                        </>
                      )}

                      {/* Row 4: Consignee Name */}
                      <tr>
                        <td className="excel-row-idx">4</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'भाडेकरूचे नाव (Rentee Name)' : 'Consignee / Rentee Name'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" placeholder={lang === 'mr' ? 'भाडेकरू व्यक्तीचे/कंपनीचे नाव' : 'Name of shop / stall rentee'} value={consigneeName} onChange={e => setConsigneeName(e.target.value)} required style={{ maxWidth: 420, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <button
                            type="button"
                            onClick={handleTranslateConsignee}
                            disabled={translating}
                            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                          >
                            {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                            {translating ? (lang === 'mr' ? 'भाषांतर होत आहे...' : 'Translating...') : (lang === 'mr' ? 'मराठीत भाषांतर' : 'Translate')}
                          </button>
                        </td>
                      </tr>

                      {/* Row 5: Consignee Address */}
                      <tr>
                        <td className="excel-row-idx">5</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'पत्ता (Consignee Address)' : 'Consignee Address'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input
                            type="text"
                            className="form-input"
                            placeholder={lang === 'mr' ? 'गाळा क्र. / मार्केट परिसर पत्ता' : 'Stall / Shop No. & Address'}
                            value={consigneeAddress}
                            onChange={e => setConsigneeAddress(e.target.value)}
                            style={{ maxWidth: 420, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{consigneeAddress}</span>
                        </td>
                      </tr>

                      {/* Row 6: Particulars */}
                      <tr>
                        <td className="excel-row-idx">6</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'भाडे प्रकार / तपशील' : 'Rent Category Particulars'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ maxWidth: 420 }}>
                            <SearchableCombobox
                              value={particularsSelect}
                              onChange={val => setParticularsSelect(val)}
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
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{particularsSelect}</span>
                        </td>
                      </tr>

                      {/* Row 7: Month / Stall Ref */}
                      <tr>
                        <td className="excel-row-idx">7</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'कालावधी / गाळा क्र.' : 'Month / Stall Ref'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input
                            type="text"
                            className="form-input"
                            placeholder={lang === 'mr' ? 'उदा. जून २०२६ - गाळा क्र. १२' : 'e.g. June 2026 - Stall No. 12'}
                            value={customParticulars}
                            onChange={e => setCustomParticulars(e.target.value)}
                            style={{ maxWidth: 420, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{customParticulars}</span>
                        </td>
                      </tr>

                      {/* Row 8: HSN/SAC */}
                      <tr>
                        <td className="excel-row-idx">8</td>
                        <td className="excel-col-label">
                          <span>HSN / SAC</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={hsnSac} onChange={e => setHsnSac(e.target.value)} style={{ maxWidth: 260, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{hsnSac}</span>
                        </td>
                      </tr>

                      {/* Row 9: Rate */}
                      <tr>
                        <td className="excel-row-idx">9</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'दर ₹ (Rate)' : 'Rate (₹)'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={rate} onChange={e => setRate(e.target.value)} required style={{ maxWidth: 260, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>₹{rate || '0.00'}</span>
                        </td>
                      </tr>

                      {/* Row 10: Qty & Per */}
                      <tr>
                        <td className="excel-row-idx">10</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'प्रमाण व युनिट (Qty & Per)' : 'Qty & Per'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input type="number" step="0.1" className="form-input" value={qty} onChange={e => setQty(e.target.value)} style={{ maxWidth: 120, height: 38 }} />
                            <input type="text" className="form-input" value={per} onChange={e => setPer(e.target.value)} style={{ maxWidth: 140, height: 38 }} />
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{qty} {per}</span>
                        </td>
                      </tr>

                      {/* Row 11: Base Amount & Taxes */}
                      <tr>
                        <td className="excel-row-idx">11</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'मूळ रक्कम व जीएसटी (Base & Taxes)' : 'Base & Tax Breakdown'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ fontSize: 13, display: 'flex', gap: 16 }}>
                            <span>Subtotal: <strong>₹{baseAmount.toFixed(2)}</strong></span>
                            <span>SGST (9%): <strong>₹{sgstAmount.toFixed(2)}</strong></span>
                            <span>CGST (9%): <strong>₹{cgstAmount.toFixed(2)}</strong></span>
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#64748b' }}>GST Rate: {gstRate}%</span>
                        </td>
                      </tr>

                      {/* Row 12: Grand Total */}
                      <tr>
                        <td className="excel-row-idx">12</td>
                        <td className="excel-col-label">
                          <span style={{ fontWeight: 800 }}>{lang === 'mr' ? 'एकूण इनव्हॉईस रक्कम ₹' : 'Grand Total Amount (₹)'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ fontWeight: 800, fontSize: 17, color: '#7c3aed' }}>
                            ₹{totalAmount.toFixed(2)}
                          </div>
                          {taxWords && (
                            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#64748b', marginTop: 4 }}>
                              {taxWords}
                            </div>
                          )}
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Total Payable</span>
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
                  {/* Row 1: Invoice No */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No.):' : 'Invoice No.:'} <span className="required">*</span>
                    </label>
                    <input type="text" className="form-input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required style={{ width: '100%', maxWidth: 300, height: 38 }} />
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
                      {lang === 'mr' ? 'भाडे स्वीकार प्रकार:' : 'Payment Mode:'} <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input type="radio" name="paymentModeRentVert" value="CASH" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} />
                        <Banknote size={14} color="#16a34a" /> {lang === 'mr' ? 'रोख (Cash)' : 'Cash'}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input type="radio" name="paymentModeRentVert" value="CHEQUE" checked={paymentMode === 'CHEQUE'} onChange={() => setPaymentMode('CHEQUE')} />
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
                        <input type="text" className="form-input" placeholder="e.g. CHQ-77201" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ width: '100%', maxWidth: 300, height: 38 }} />
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
                        <input type="text" className="form-input" placeholder="e.g. SBI Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: '100%', maxWidth: 360, height: 38 }} />
                      </div>
                    </div>
                  )}

                  {/* Row 4: Consignee Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 220, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {lang === 'mr' ? 'भाडेकरूचे नाव:' : 'Consignee / Rentee:'} <span className="required">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleTranslateConsignee}
                        disabled={translating}
                        style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                      >
                        {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                        {translating ? (lang === 'mr' ? '...' : '...') : (lang === 'mr' ? 'मराठी' : 'Translate')}
                      </button>
                    </div>
                    <input type="text" className="form-input" placeholder={lang === 'mr' ? 'भाडेकरू व्यक्तीचे/कंपनीचे नाव' : 'Name of shop / stall rentee'} value={consigneeName} onChange={e => setConsigneeName(e.target.value)} required style={{ width: '100%', maxWidth: 420, height: 38 }} />
                  </div>

                  {/* Row 5: Consignee Address */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'पत्ता (Address):' : 'Address:'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'गाळा क्र. / मार्केट परिसर पत्ता' : 'Stall / Shop No. & Address'}
                      value={consigneeAddress}
                      onChange={e => setConsigneeAddress(e.target.value)}
                      style={{ width: '100%', maxWidth: 420, height: 38 }}
                    />
                  </div>

                  {/* Row 6: Particulars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'भाडे प्रकार / तपशील:' : 'Rent Category:'}
                    </label>
                    <div style={{ width: '100%', maxWidth: 420 }}>
                      <SearchableCombobox
                        value={particularsSelect}
                        onChange={val => setParticularsSelect(val)}
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

                  {/* Row 7: Month / Stall Ref */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'कालावधी / गाळा क्र.:' : 'Month / Stall Ref:'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'उदा. जून २०२६ - गाळा क्र. १२' : 'e.g. June 2026 - Stall No. 12'}
                      value={customParticulars}
                      onChange={e => setCustomParticulars(e.target.value)}
                      style={{ width: '100%', maxWidth: 420, height: 38 }}
                    />
                  </div>

                  {/* Row 8: HSN/SAC */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      HSN / SAC:
                    </label>
                    <input type="text" className="form-input" value={hsnSac} onChange={e => setHsnSac(e.target.value)} style={{ width: '100%', maxWidth: 260, height: 38 }} />
                  </div>

                  {/* Row 9: Rate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'दर ₹ (Rate):' : 'Rate (₹):'} <span className="required">*</span>
                    </label>
                    <input type="number" step="0.01" className="form-input" placeholder="0.00" value={rate} onChange={e => setRate(e.target.value)} required style={{ width: '100%', maxWidth: 260, height: 38 }} />
                  </div>

                  {/* Row 10: Qty & Per */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'प्रमाण व युनिट (Qty & Per):' : 'Qty & Per:'}
                    </label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input type="number" step="0.1" className="form-input" value={qty} onChange={e => setQty(e.target.value)} style={{ width: 120, height: 38 }} />
                      <input type="text" className="form-input" value={per} onChange={e => setPer(e.target.value)} style={{ width: 140, height: 38 }} />
                    </div>
                  </div>

                  {/* Row 11: Tax Breakdown & Total */}
                  <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: 8 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                      {lang === 'mr' ? 'जीएसटी कर व एकूण बेरीज' : 'Tax & Grand Total Calculations'}
                    </h4>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal: </span>
                        <strong>₹{baseAmount.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>SGST (9%): </span>
                        <strong>₹{sgstAmount.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>CGST (9%): </span>
                        <strong>₹{cgstAmount.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Grand Total: </span>
                        <strong style={{ fontSize: 16, color: '#16a34a' }}>₹{totalAmount.toFixed(2)}</strong>
                      </div>
                    </div>
                    {taxWords && (
                      <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        {taxWords}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: editingId ? '#d97706' : undefined, borderColor: editingId ? '#d97706' : undefined }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : editingId ? (lang === 'mr' ? 'भाडे बिल बदल जतन करा' : 'Update Rent Invoice') : (lang === 'mr' ? 'जतन करा आणि व्यवहार पोस्ट करा' : 'Save & Post Transaction')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              setTranslating(true);
              setMsg({
                type: 'info',
                text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
              });
              try {
                if (consigneeName) setConsigneeName(await translateToMarathi(consigneeName));
                if (consigneeAddress) setConsigneeAddress(await translateToMarathi(consigneeAddress));
                if (customParticulars) setCustomParticulars(await translateToMarathi(customParticulars));
                if (bankName) setBankName(await translateToMarathi(bankName));
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
          h.consignee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.invoice_no.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const totalAmount = filteredHistory.reduce((s, h) => s + (Number(h.total_amount) || 0), 0);

        return (
          <div style={{ marginTop: 32 }}>
            {/* Filter Bar */}
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
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{lang === 'mr' ? 'कालावधी:' : 'Period:'}</span>
                <input type="date" className="form-input" style={{ width: 140, padding: '4px 8px', fontSize: 13 }} value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
                <input type="date" className="form-input" style={{ width: 140, padding: '4px 8px', fontSize: 13 }} value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="var(--text-secondary)" />
                <input type="text" className="form-input" style={{ width: 220, padding: '4px 8px', fontSize: 13 }} placeholder={lang === 'mr' ? 'शोधा (भाडेकरू, इनव्हॉईस क्र.)...' : 'Search rentee, invoice...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center' }}>
                {lang === 'mr' ? `${filteredHistory.length} नोंदी` : `${filteredHistory.length} entries`}
              </span>
            </div>

            {/* General Ledger Card Table */}
            <div className="card" style={{ borderTop: '4px solid #15803d', boxShadow: '0 4px 24px rgba(21, 128, 61, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {lang === 'mr' ? 'भाडे बिल इनव्हॉईस नोंदवही' : 'Rent Bill Tax Invoices History'}
                </h4>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '4px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
                  {lang === 'mr' ? `एकूण इनव्हॉईस: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Total Invoices: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <div className="table-wrapper">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-title">
                      {lang === 'mr' ? 'निवडलेल्या कालावधीत कोणत्याही नोंदी आढळल्या नाहीत' : 'No rent bills found for selected date range'}
                    </div>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>{lang === 'mr' ? 'इनव्हॉईस क्र.' : 'Invoice No.'}</th>
                        <th style={{ width: 110 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                        <th>{lang === 'mr' ? 'भाडेकरू (Consignee / Rentee)' : 'Consignee / Rentee'}</th>
                        <th style={{ width: 120 }}>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                        <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                        <th style={{ textAlign: 'right', width: 120 }}>{lang === 'mr' ? 'मूलभूत रक्कम ₹' : 'Base Amt (₹)'}</th>
                        <th style={{ textAlign: 'right', color: '#15803d', width: 140 }}>
                          {lang === 'mr' ? 'एकूण इनव्हॉईस (₹)' : 'Total Invoice (₹)'}
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
                            borderLeft: '3px solid #15803d',
                          }}
                        >
                          <td style={{ fontWeight: 700, color: 'var(--text-brand)', fontFamily: 'monospace' }}>{row.invoice_no}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date}</td>
                          <td style={{ fontWeight: 600 }}>{row.consignee_name}</td>
                          <td>
                            <span className={`badge ${row.payment_mode === 'CHEQUE' ? 'badge-primary' : 'badge-secondary'}`}>
                              {row.payment_mode || 'CASH'} {row.cheque_no ? `(${row.cheque_no})` : ''}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{lang === 'mr' ? (ITEM_TRANSLATIONS[row.particulars || ''] || row.particulars) : row.particulars}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#15803d', fontSize: 14 }}>
                            ₹{Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Rent Bill">
                              <Edit size={13} /> {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 4 }} title="Print Invoice">
                              <Printer size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} title="Delete Rent Bill">
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
                        <td colSpan={6} style={{ color: '#c7d2fe', padding: '10px 14px', fontWeight: 700 }}>
                          {lang === 'mr'
                            ? `एकूण भाडे बिल इनव्हॉईस (${filteredHistory.length} नोंदी)`
                            : `TOTAL RENT INVOICES (${filteredHistory.length} entries)`}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#86efac', fontSize: 14, fontWeight: 800 }}>
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

      {/* Printable Invoice View matching Image #1 */}
      {(showPrintModal || selectedBill) && selectedBill && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 750, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'भाडे बिल पूर्वावलोकन व मुद्रण' : 'Rent Bill Tax Invoice Preview & Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedBill(null); }}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Image #1 layout */}
            <div className="printable-tax-invoice" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold' }}>
                  <span>GSTIN : 29AAAAT4655K1Z1</span>
                  <span>TAX INVOICE</span>
                  <span>H.O. : 2460554</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: '4px 0' }}>
                  THE BELGAUM GARDENERS CO-OP. PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM.
                </h3>
                <div style={{ fontSize: 12 }}>
                  930/1A Zanda Chowk Market, BELGAUM - 590 002.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <div><strong>No.:</strong> {selectedBill.invoice_no}</div>
                <div><strong>Date:</strong> {selectedBill.date}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 8 }}>
                <div><strong>Consignee:</strong> {selectedBill.consignee_name} {selectedBill.consignee_address ? `(${selectedBill.consignee_address})` : ''}</div>
                <div><strong>Mode:</strong> {selectedBill.payment_mode || 'CASH'} {selectedBill.cheque_no ? `(Chq: ${selectedBill.cheque_no})` : ''}</div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Sl. NO.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Particulars</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>HSN / SAC</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>GST Rate</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Per</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ minHeight: 60 }}>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{selectedBill.particulars || 'Shop Rent'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.hsn_sac || '997212'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.gst_rate}%</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.qty}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(selectedBill.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{selectedBill.per || 'Month'}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedBill.amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #000', padding: 10, fontSize: 12, marginBottom: 12 }}>
                <div style={{ width: '55%' }}>
                  <strong>Bank Details:</strong><br />
                  Current A/c No: __________________<br />
                  Branch: Belgaum<br />
                  IFSC Code: __________________
                </div>
                <div style={{ width: '40%', borderLeft: '1px solid #000', paddingLeft: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>TOTAL:</span>
                    <span>₹{Number(selectedBill.amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>SGST 9%:</span>
                    <span>₹{Number(selectedBill.sgst_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>CGST 9%:</span>
                    <span>₹{Number(selectedBill.cgst_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(selectedBill.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, marginBottom: 30 }}>
                <strong>Tax Amount (in words):</strong> {selectedBill.tax_amount_words}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 30 }}>
                <div>Manager<br /><br />_______________</div>
                <div>Cashier<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentBillForm;
