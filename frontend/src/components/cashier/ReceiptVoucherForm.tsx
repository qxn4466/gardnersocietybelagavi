import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Upload, Eye, Download, CreditCard, Banknote, Zap, Calendar, Search, Languages, FileText, Receipt, Loader2, Table, List } from 'lucide-react';
import { fetchNextReceiptBillNo, createReceiptVoucher, updateReceiptVoucher, fetchReceiptVouchers, deleteReceiptVoucher, fetchOffice, uploadCashierReceipt, getFileUrl, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import InlineDocViewer from '../InlineDocViewer';
import type { CashReceiptVoucher, User, OfficeMaster } from '../../types';
import { RECEIPT_PARTICULARS_OPTIONS } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ITEM_TRANSLATIONS } from '../../i18n/translations';
import { translateToMarathi } from '../../utils/translator';
import SearchableCombobox from '../SearchableCombobox';

interface ReceiptVoucherFormProps {
  user?: User | null;
}

const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [billNo, setBillNo] = useState('');
  const [gstNo, setGstNo] = useState('29AAAAT4655K1Z1');
  const [phoneNo, setPhoneNo] = useState('2460554');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [particularsOptions, setParticularsOptions] = useState<string[]>(RECEIPT_PARTICULARS_OPTIONS);
  const [particularsSelect, setParticularsSelect] = useState(RECEIPT_PARTICULARS_OPTIONS[0]);
  const [customParticulars, setCustomParticulars] = useState('');
  const [loanAmount, setLoanAmount] = useState<string>('0');
  const [interestAmount, setInterestAmount] = useState<string>('0');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today);
  const [bankName, setBankName] = useState('');

  const [receiptDocPath, setReceiptDocPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_cashier_receipt_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleViewModeChange = (mode: 'excel' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('bgs_cashier_receipt_view_mode', mode);
  };

  // Date Filters & Search
  const [startDateFilter, setStartDateFilter] = useState(thirtyDaysAgo);
  const [endDateFilter, setEndDateFilter] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<CashReceiptVoucher[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceiptVoucher | null>(null);

  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');

  useEffect(() => {
    if (!editingId) loadNextBillNo(date);
    loadHistory();
    loadOfficeDetails();
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
    const l = parseFloat(loanAmount) || 0;
    const i = parseFloat(interestAmount) || 0;
    setTotalAmount(l + i);
  }, [loanAmount, interestAmount]);

  const loadOfficeDetails = async () => {
    try {
      const off: OfficeMaster = await fetchOffice();
      if (off) {
        if (off.gst_no) setGstNo(off.gst_no);
        if (off.phone1) setPhoneNo(off.phone1);
      }
    } catch {
      // ignore
    }
  };

  const loadNextBillNo = async (d: string) => {
    try {
      const res = await fetchNextReceiptBillNo(d);
      setBillNo(res.bill_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchReceiptVouchers(startDateFilter, endDateFilter);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadCashierReceipt(file);
      setReceiptDocPath(res.filepath);
      setMsg({ type: 'success', text: lang === 'mr' ? 'पावती फाइल यशस्वीरित्या अपलोड झाली!' : 'Receipt document uploaded successfully!' });
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'फाइल अपलोड अपयशी ठरले.' : 'File upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleTranslateReceivedFrom = async () => {
    if (!receivedFrom.trim()) return;
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      const tr = await translateToMarathi(receivedFrom);
      setReceivedFrom(tr);
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

  const handleEdit = (r: CashReceiptVoucher) => {
    setEditingId(r.id);
    setDate(r.date);
    setBillNo(r.bill_no);
    setReceivedFrom(r.received_from);
    setLoanAmount(String(r.loan_amount || 0));
    setInterestAmount(String(r.interest_amount || 0));
    setPaymentMode((r.payment_mode || 'CASH') as 'CASH' | 'CHEQUE');
    setChequeNo(r.cheque_no || '');
    setChequeDate(r.cheque_date || today);
    setBankName(r.bank_name || '');
    setReceiptDocPath(r.receipt_doc_path || '');
    setParticularsSelect(particularsOptions[0]);
    setCustomParticulars(r.particulars || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addCustomParticular = () => {
    const custom = window.prompt(lang === 'mr' ? 'नवीन बाबीचे नाव प्रविष्ट करा:' : 'Enter new receipt particular name:');
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
    setReceivedFrom('');
    setParticularsSelect(particularsOptions[0]);
    setCustomParticulars('');
    setLoanAmount('0');
    setInterestAmount('0');
    setPaymentMode('CASH');
    setChequeNo('');
    setChequeDate(today);
    setBankName('');
    setReceiptDocPath('');
    setMsg(null);
    loadNextBillNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedFrom.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा देणाऱ्या व्यक्तीचे नाव प्रविष्ट करा.' : 'Please enter Received From name.' });
      return;
    }
    if (totalAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया कर्जाची रक्कम किंवा व्याजाची रक्कम प्रविष्ट करा.' : 'Please enter Loan Amount or Interest Amount.' });
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
        bill_no: billNo,
        gst_no: gstNo,
        phone_no: phoneNo,
        received_from: receivedFrom.trim(),
        particulars: finalParticulars,
        loan_amount: parseFloat(loanAmount) || 0,
        interest_amount: parseFloat(interestAmount) || 0,
        total_amount: totalAmount,
        receipt_doc_path: receiptDocPath || undefined,
        payment_mode: paymentMode,
        cheque_no: paymentMode === 'CHEQUE' ? chequeNo.trim() : undefined,
        cheque_date: paymentMode === 'CHEQUE' ? chequeDate : undefined,
        bank_name: paymentMode === 'CHEQUE' ? bankName.trim() : undefined,
        created_by: user?.username || 'cashier',
      };

      if (editingId) {
        const updated = await updateReceiptVoucher(editingId, payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? `पावती बिल क्र. ${updated.bill_no} अपडेट केले!` : `Cash Receipt Voucher ${updated.bill_no} updated successfully!`
        });
      } else {
        const created = await createReceiptVoucher(payload);
        const modeNote = paymentMode === 'CHEQUE'
          ? (lang === 'mr' ? ' स्क्रोल पुस्तक व चेक बुकमध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll & Cheque Issue Book!')
          : (lang === 'mr' ? ' स्क्रोल पुस्तक (जमा/Received) मध्ये स्वयंचलित नोंदवली!' : ' Auto-updated in Cash Scroll Book!');

        setMsg({
          type: 'success',
          text: (lang === 'mr' ? `पावती बिल क्र. ${created.bill_no} जतन केले!` : `Cash Receipt Voucher ${created.bill_no} saved!`) + modeNote
        });
        setSelectedReceipt(created);
      }

      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'पावती जतन करताना त्रुटी आली.' : 'Error saving receipt voucher.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही पावती हटवायची आहे का?' : 'Are you sure you want to delete this receipt voucher?')) return;
    try {
      await deleteReceiptVoucher(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (r: CashReceiptVoucher) => {
    setSelectedReceipt(r);
    setShowPrintModal(true);
  };

  return (
    <div>
      {/* Form Entry Card — Accountant Styled Layout */}
      <div className="card" style={{ borderTop: '4px solid #15803d', boxShadow: '0 4px 16px rgba(21, 128, 61, 0.08)', marginBottom: 28 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#dcfce7', padding: 8, borderRadius: 8, color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {lang === 'mr' ? '२. रोख पावती / कॅश मेमो नोंद (Receipt Voucher Entry)' : '2. Cash Receipt Voucher Entry'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {lang === 'mr' ? '* चिन्हांकित सर्व रकाने अनिवार्य आहेत (स्क्रोल बुकात जमा/Received नोंद होईल)' : '* All fields marked with * are required (Auto-posts to Cash Scroll Received)'}
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
                id="receipt-excel-view-btn"
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
                id="receipt-vertical-view-btn"
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
                <Printer size={14} /> {lang === 'mr' ? 'पावती प्रिंट' : 'Print Receipt'}
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
                      {lang === 'mr' ? 'रोख पावती तपशील (एक्सेल ग्रिड)' : 'CASH_RECEIPT_ENTRY_SHEET (Excel Grid)'}
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
                      {/* Row 1: Bill No */}
                      <tr>
                        <td className="excel-row-idx">1</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'बिल क्र. (Bill No.)' : 'Bill No.'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={billNo} onChange={e => setBillNo(e.target.value)} required style={{ maxWidth: 300, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{billNo}</span>
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

                      {/* Row 3: GST No */}
                      <tr>
                        <td className="excel-row-idx">3</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'GST No.' : 'GST No.'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={gstNo} onChange={e => setGstNo(e.target.value)} style={{ maxWidth: 300, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{gstNo}</span>
                        </td>
                      </tr>

                      {/* Row 4: Phone No */}
                      <tr>
                        <td className="excel-row-idx">4</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'फोन क्र. (Phone No.)' : 'Phone No.'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" value={phoneNo} onChange={e => setPhoneNo(e.target.value)} style={{ maxWidth: 260, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{phoneNo}</span>
                        </td>
                      </tr>

                      {/* Row 5: Received From */}
                      <tr>
                        <td className="excel-row-idx">5</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'कडून मिळाले (Received From)' : 'Received From'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <input type="text" className="form-input" placeholder={lang === 'mr' ? 'ज्या ग्राहकाकडून/सदस्याकडून रोख मिळाले त्यांचे नाव' : 'Name of customer / member paying cash'} value={receivedFrom} onChange={e => setReceivedFrom(e.target.value)} required style={{ maxWidth: 420, height: 38 }} />
                        </td>
                        <td className="excel-col-tools">
                          <button
                            type="button"
                            onClick={handleTranslateReceivedFrom}
                            disabled={translating}
                            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                          >
                            {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                            {translating ? (lang === 'mr' ? 'भाषांतर होत आहे...' : 'Translating...') : (lang === 'mr' ? 'मराठीत भाषांतर' : 'Translate')}
                          </button>
                        </td>
                      </tr>

                      {/* Row 6: Payment Mode */}
                      <tr>
                        <td className="excel-row-idx">6</td>
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
                            <td className="excel-row-idx">6a</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'चेक क्र. (Cheque No.)' : 'Cheque No.'}</span>
                              <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                            </td>
                            <td className="excel-col-input">
                              <input type="text" className="form-input" placeholder="e.g. CHQ-99102" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ maxWidth: 300, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{chequeNo}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="excel-row-idx">6b</td>
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
                            <td className="excel-row-idx">6c</td>
                            <td className="excel-col-label">
                              <span>{lang === 'mr' ? 'बँकेचे नाव (Bank Name)' : 'Bank Name'}</span>
                            </td>
                            <td className="excel-col-input">
                              <input type="text" className="form-input" placeholder="e.g. Canara Bank Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ maxWidth: 360, height: 38 }} />
                            </td>
                            <td className="excel-col-tools">
                              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{bankName}</span>
                            </td>
                          </tr>
                        </>
                      )}

                      {/* Row 7: Particulars */}
                      <tr>
                        <td className="excel-row-idx">7</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'तपशील खाते (Particulars)' : 'Particulars'}</span>
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

                      {/* Row 8: Remarks */}
                      <tr>
                        <td className="excel-row-idx">8</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'अतिरिक्त शेरा / संदर्भ' : 'Additional Remarks / Ref'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input
                            type="text"
                            className="form-input"
                            placeholder={lang === 'mr' ? 'उदा. खाते क्र., रसीद क्र. किंवा पावती तपशील' : 'e.g. A/C No, Receipt Note'}
                            value={customParticulars}
                            onChange={e => setCustomParticulars(e.target.value)}
                            style={{ maxWidth: 420, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{customParticulars}</span>
                        </td>
                      </tr>

                      {/* Row 9: Loan Amount */}
                      <tr>
                        <td className="excel-row-idx">9</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'कर्ज रक्कम ₹ (Loan Amount)' : 'Loan Amount (₹)'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={loanAmount}
                            onChange={e => setLoanAmount(e.target.value)}
                            style={{ maxWidth: 260, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>₹{loanAmount}</span>
                        </td>
                      </tr>

                      {/* Row 10: Interest Amount */}
                      <tr>
                        <td className="excel-row-idx">10</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'व्याज रक्कम ₹ (Interest Amount)' : 'Interest Amount (₹)'}</span>
                        </td>
                        <td className="excel-col-input">
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={interestAmount}
                            onChange={e => setInterestAmount(e.target.value)}
                            style={{ maxWidth: 260, height: 38 }}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>₹{interestAmount}</span>
                        </td>
                      </tr>

                      {/* Row 11: Total Amount */}
                      <tr>
                        <td className="excel-row-idx">11</td>
                        <td className="excel-col-label">
                          <span style={{ fontWeight: 800 }}>{lang === 'mr' ? 'एकूण जमा रक्कम ₹ (Total Amount)' : 'Total Amount (₹)'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ fontWeight: 800, fontSize: 17, color: '#16a34a' }}>
                            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Auto-calculated</span>
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
                  {/* Row 1: Bill No */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'बिल क्र. (Bill No.):' : 'Bill No.:'} <span className="required">*</span>
                    </label>
                    <input type="text" className="form-input" value={billNo} onChange={e => setBillNo(e.target.value)} required style={{ width: '100%', maxWidth: 300, height: 38 }} />
                  </div>

                  {/* Row 2: Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'दिनांक (Date):' : 'Date:'} <span className="required">*</span>
                    </label>
                    <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', maxWidth: 260, height: 38 }} />
                  </div>

                  {/* Row 3: GST No */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'GST No.:' : 'GST No.:'}
                    </label>
                    <input type="text" className="form-input" value={gstNo} onChange={e => setGstNo(e.target.value)} style={{ width: '100%', maxWidth: 300, height: 38 }} />
                  </div>

                  {/* Row 4: Phone No */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'फोन क्र. (Phone No.):' : 'Phone No.:'}
                    </label>
                    <input type="text" className="form-input" value={phoneNo} onChange={e => setPhoneNo(e.target.value)} style={{ width: '100%', maxWidth: 260, height: 38 }} />
                  </div>

                  {/* Row 5: Received From */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 220, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {lang === 'mr' ? 'कडून मिळाले:' : 'Received From:'} <span className="required">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleTranslateReceivedFrom}
                        disabled={translating}
                        style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: translating ? 0.6 : 1 }}
                      >
                        {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                        {translating ? (lang === 'mr' ? '...' : '...') : (lang === 'mr' ? 'मराठी' : 'Translate')}
                      </button>
                    </div>
                    <input type="text" className="form-input" placeholder={lang === 'mr' ? 'ज्या ग्राहकाकडून/सदस्याकडून रोख मिळाले त्यांचे नाव' : 'Name of customer / member paying cash'} value={receivedFrom} onChange={e => setReceivedFrom(e.target.value)} required style={{ width: '100%', maxWidth: 420, height: 38 }} />
                  </div>

                  {/* Row 6: Payment Mode */}
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
                        <input type="text" className="form-input" placeholder="e.g. CHQ-99102" value={chequeNo} onChange={e => setChequeNo(e.target.value)} required={paymentMode === 'CHEQUE'} style={{ width: '100%', maxWidth: 300, height: 38 }} />
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
                        <input type="text" className="form-input" placeholder="e.g. Canara Bank Belgaum" value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: '100%', maxWidth: 360, height: 38 }} />
                      </div>
                    </div>
                  )}

                  {/* Row 7: Particulars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'तपशील खाते (Particulars):' : 'Particulars:'}
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

                  {/* Row 8: Remarks */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'अतिरिक्त शेरा / संदर्भ:' : 'Additional Remarks:'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'उदा. खाते क्र., रसीद क्र. किंवा पावती तपशील' : 'e.g. A/C No, Receipt Note'}
                      value={customParticulars}
                      onChange={e => setCustomParticulars(e.target.value)}
                      style={{ width: '100%', maxWidth: 420, height: 38 }}
                    />
                  </div>

                  {/* Row 9: Loan Amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'कर्ज रक्कम ₹ (Loan Amount):' : 'Loan Amount (₹):'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={loanAmount}
                      onChange={e => setLoanAmount(e.target.value)}
                      style={{ width: '100%', maxWidth: 260, height: 38 }}
                    />
                  </div>

                  {/* Row 10: Interest Amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {lang === 'mr' ? 'व्याज रक्कम ₹ (Interest):' : 'Interest Amount (₹):'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={interestAmount}
                      onChange={e => setInterestAmount(e.target.value)}
                      style={{ width: '100%', maxWidth: 260, height: 38 }}
                    />
                  </div>

                  {/* Row 11: Total Amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ width: 220, fontWeight: 800, fontSize: 14, color: '#1e293b' }}>
                      {lang === 'mr' ? 'एकूण रक्कम ₹ (Total):' : 'Total Amount (₹):'}
                    </label>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#16a34a' }}>
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Receipt Document Upload Section */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <Upload size={16} color="var(--blue-600)" />
            {lang === 'mr' ? 'पावती / मेमो फाइल अपलोड करा (Upload Scanned Receipt / Memo)' : 'Upload Scanned Receipt / Memo Document'}
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
                title={lang === 'mr' ? 'अपलोड केलेली पावती' : 'Uploaded Receipt Document'}
                buttonText={lang === 'mr' ? 'अपलोड केलेली फाइल पाहा' : 'View Uploaded Document'}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: editingId ? '#d97706' : undefined, borderColor: editingId ? '#d97706' : undefined }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : editingId ? (lang === 'mr' ? 'पावती बदल जतन करा' : 'Update Cash Memo') : (lang === 'mr' ? 'जतन करा आणि व्यवहार पोस्ट करा' : 'Save & Post Transaction')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              setTranslating(true);
              setMsg({
                type: 'info',
                text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
              });
              try {
                if (receivedFrom) setReceivedFrom(await translateToMarathi(receivedFrom));
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
          h.received_from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.bill_no.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const totalAmount = filteredHistory.reduce((s, h) => s + (Number(h.total_amount) || 0), 0);

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
                <input type="text" className="form-input" style={{ width: 240, height: 34, fontSize: 13 }} placeholder={lang === 'mr' ? 'शोधा (नाव, बिल क्र.)...' : 'Search received from, bill...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center', fontWeight: 600 }}>
                {lang === 'mr' ? `${filteredHistory.length} नोंदी` : `${filteredHistory.length} entries`}
              </span>
            </div>

            {/* General Ledger Card Table */}
            <div className="card" style={{ borderTop: '4px solid #15803d', boxShadow: '0 4px 24px rgba(21, 128, 61, 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#fff', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {lang === 'mr' ? 'रोख पावती नोंदवही (Cash Memos)' : 'Cash Receipt Vouchers History'}
                </h4>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '4px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
                  {lang === 'mr' ? `एकूण जमा: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Total Received: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <div className="table-wrapper">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-title">
                      {lang === 'mr' ? 'निवडलेल्या कालावधीत कोणत्याही नोंदी आढळल्या नाहीत' : 'No receipt vouchers found for selected date range'}
                    </div>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>{lang === 'mr' ? 'बिल क्र.' : 'Bill No.'}</th>
                        <th style={{ width: 110 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                        <th>{lang === 'mr' ? 'कडून मिळाले (Received From)' : 'Received From'}</th>
                        <th style={{ width: 120 }}>{lang === 'mr' ? 'प्रकार' : 'Mode'}</th>
                        <th>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                        <th style={{ width: 100 }}>{lang === 'mr' ? 'पावती फाइल' : 'Receipt Doc'}</th>
                        <th style={{ textAlign: 'right', color: '#15803d', width: 140 }}>
                          {lang === 'mr' ? 'जमा रक्कम (Credit ₹)' : 'Total (Credit ₹)'}
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
                          <td style={{ fontWeight: 700, color: 'var(--text-brand)', fontFamily: 'monospace' }}>{row.bill_no}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date}</td>
                          <td style={{ fontWeight: 600 }}>{row.received_from}</td>
                          <td>
                            <span className={`badge ${row.payment_mode === 'CHEQUE' ? 'badge-primary' : 'badge-secondary'}`}>
                              {row.payment_mode || 'CASH'} {row.cheque_no ? `(${row.cheque_no})` : ''}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{lang === 'mr' ? (ITEM_TRANSLATIONS[row.particulars || ''] || row.particulars) : row.particulars}</td>
                          <td>
                            {row.receipt_doc_path ? (
                              <InlineDocViewer
                                docPath={row.receipt_doc_path}
                                buttonText="Doc"
                                title={`Bill ${row.bill_no} - Receipt`}
                              />
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#15803d', fontSize: 14 }}>
                            ₹{Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Receipt">
                              <Edit size={13} /> {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 4 }} title="Print Cash Memo">
                              <Printer size={13} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} title="Delete Receipt">
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
                            ? `एकूण पावती व्हाऊचर्स (${filteredHistory.length} नोंदी)`
                            : `TOTAL RECEIPT VOUCHERS (${filteredHistory.length} entries)`}
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

      {/* Printable Memo View matching Image #4 */}
      {(showPrintModal || selectedReceipt) && selectedReceipt && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 650, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'कॅश मेमो पूर्वावलोकन व मुद्रण' : 'Cash Memo Preview & Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedReceipt(null); }}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Image #4 layout */}
            <div className="printable-receipt" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                  BELGAUM GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                  <div>GST No.: {selectedReceipt.gst_no || '29AAAAT4655K1Z1'}</div>
                  <div>Phone No.: {selectedReceipt.phone_no || '2460554'}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8, letterSpacing: '0.05em' }}>
                  CASH MEMO
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                <div><strong>Bill No.:</strong> {selectedReceipt.bill_no}</div>
                <div><strong>Date:</strong> {selectedReceipt.date}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, borderBottom: '1px solid #ddd', paddingBottom: 6 }}>
                <div><strong>Received From (Name):</strong> {selectedReceipt.received_from}</div>
                <div><strong>Mode:</strong> {selectedReceipt.payment_mode || 'CASH'} {selectedReceipt.cheque_no ? `(Chq: ${selectedReceipt.cheque_no})` : ''}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13 }}>Particulars:</strong>
                <div style={{ border: '1px dashed #666', minHeight: 60, padding: 8, marginTop: 4, fontSize: 13 }}>
                  {selectedReceipt.particulars || 'Cash Received'}
                </div>
              </div>

              <div style={{ border: '1px solid #000', padding: 12, marginBottom: 30, background: '#fdfdfd' }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, borderBottom: '1px solid #000', paddingBottom: 4, marginBottom: 8 }}>
                  Amount Details:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Loan Amount:</span>
                  <span>₹ {Number(selectedReceipt.loan_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Interest Amount:</span>
                  <span>₹ {Number(selectedReceipt.interest_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: 6, marginTop: 6 }}>
                  <span>Total:</span>
                  <span>₹ {Number(selectedReceipt.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Signature of Payer<br /><br />_______________</div>
                <div>Accountant's Signature<br /><br />_______________</div>
                <div>Cashier's Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptVoucherForm;
