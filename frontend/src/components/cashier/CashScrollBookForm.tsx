import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Zap, Calendar, Search, Languages, BookOpen, Loader2 } from 'lucide-react';
import { createCashScrollEntry, fetchCashScrollEntries, deleteCashScrollEntry, fetchOffice, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import type { CashScrollBookEntry, User, OfficeMaster } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi } from '../../utils/translator';

interface CashScrollBookFormProps {
  user?: User | null;
}

const CashScrollBookForm: React.FC<CashScrollBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [pageNo, setPageNo] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [particulars, setParticulars] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [chequeAmount, setChequeAmount] = useState<string>('0');

  // Date Filter & Search
  const [startDateFilter, setStartDateFilter] = useState(thirtyDaysAgo);
  const [endDateFilter, setEndDateFilter] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<CashScrollBookEntry[]>([]);
  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
    loadOffice();
  }, [startDateFilter, endDateFilter]);

  const loadOffice = async () => {
    try {
      const data = await fetchOffice();
      setOffice(data);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchCashScrollEntries(startDateFilter, endDateFilter);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleTranslateParticulars = async () => {
    if (!particulars.trim()) return;
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
    });
    try {
      const tr = await translateToMarathi(particulars);
      setParticulars(tr);
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

  const handleReset = () => {
    setPageNo('');
    setVoucherNo('');
    setParticulars('');
    setReceivedAmount('0');
    setPaidAmount('0');
    setChequeAmount('0');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!particulars.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा/नावे तपशील प्रविष्ट करा.' : 'Please enter particulars (From Received and Paid).' });
      return;
    }
    const rec = parseFloat(receivedAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const chq = parseFloat(chequeAmount) || 0;

    if (rec === 0 && paid === 0 && chq === 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा, नावे किंवा चेकची रक्कम प्रविष्ट करा.' : 'Please enter Received, Paid, or Cheque amount.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await createCashScrollEntry({
        date,
        page_no: pageNo.trim() || undefined,
        voucher_no: voucherNo.trim() || undefined,
        from_received_paid: particulars.trim(),
        received_amount: rec,
        paid_amount: paid,
        cheque_amount: chq,
        created_by: user?.username || 'cashier',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'रोख स्क्रोल नोंद यशस्वीरित्या जतन केली!' : 'Cash scroll book entry saved successfully!'
      });
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'स्क्रोल नोंद जतन करताना त्रुटी आली.' : 'Error saving cash scroll entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this entry?')) return;
    try {
      await deleteCashScrollEntry(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const totalReceived = history.reduce((s, r) => s + Number(r.received_amount || 0), 0);
  const totalPaid = history.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const totalCheque = history.reduce((s, r) => s + Number(r.cheque_amount || 0), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #2563eb', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dbeafe', padding: 10, borderRadius: 8, color: '#1e40af' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              4. {lang === 'mr' ? 'रोख स्क्रोल पुस्तक (Cash Scroll Book)' : 'Cash Scroll Book'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'व्हाऊचर, बिल व इनव्हॉईसमधून स्वयंचलित अपडेट होणारे दैनिक रोख स्क्रोल नोंदवही' : 'Daily Cash Scroll Register auto-updated from Vouchers, Bills & Invoices'}
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={14} /> {lang === 'mr' ? 'स्क्रोल पुस्तक प्रिंट करा' : 'Print Scroll Book'}
          </button>
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

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          {lang === 'mr' ? 'हस्ते स्क्रोल नोंद जोडा (Manual Scroll Entry)' : 'Add Manual Scroll Entry'}
        </h4>
        <div className="form-grid-3" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'पान क्र. (Page No.)' : 'Page No.'}</label>
            <input type="text" className="form-input" placeholder="e.g. 662" value={pageNo} onChange={e => setPageNo(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'व्हाऊचर / B कॅश क्र.' : 'V. / B Cash No.'}</label>
            <input type="text" className="form-input" placeholder="e.g. PV-001" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="form-label" style={{ margin: 0 }}>{lang === 'mr' ? 'कोणाकडून आले व दिले (From Received and Paid)' : 'From Received and Paid'}</label>
            <button
              type="button"
              onClick={handleTranslateParticulars}
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
            placeholder={lang === 'mr' ? 'तपशील / खाते नाव' : 'Particulars / Member or Vendor Name'}
            value={particulars}
            onChange={e => setParticulars(e.target.value)}
            required
          />
        </div>

        <div className="form-grid-3" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'जमा आलेली रक्कम ₹ (Received Amount)' : 'Received Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" style={{ fontWeight: 600, color: '#16a34a' }} value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'नावे दिलेली रक्कम ₹ (Paid Amount)' : 'Paid Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" style={{ fontWeight: 600, color: '#dc2626' }} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'चेक रक्कम ₹ (Cheque Amount)' : 'Cheque Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" style={{ fontWeight: 600, color: '#2563eb' }} value={chequeAmount} onChange={e => setChequeAmount(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            <Save size={14} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'नोंद जोडा' : 'Add Entry')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Date Filter & Totals Bar */}
      <div className="filter-bar" style={{ marginBottom: 14 }}>
        <div className="filter-bar-group">
          <Calendar size={15} color="var(--blue-600)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी अनुसार स्क्रोल:' : 'Filter Scroll Period:'}</span>
          <input type="date" className="form-input" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
          <span style={{ fontSize: 12 }}>to</span>
          <input type="date" className="form-input" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
        </div>
        <div className="filter-bar-group">
          <Search size={14} color="var(--text-secondary)" />
          <input type="text" className="form-input" style={{ width: 150, padding: '3px 6px', fontSize: 12 }} placeholder={lang === 'mr' ? 'शोधा...' : 'Search particulars...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="filter-bar-spacer" />
        <div className="filter-bar-group" style={{ fontSize: 13, gap: 16 }}>
          <div>Rec: <strong style={{ color: '#16a34a' }}>₹{totalReceived.toFixed(2)}</strong></div>
          <div>Paid: <strong style={{ color: '#dc2626' }}>₹{totalPaid.toFixed(2)}</strong></div>
          <div>Cheque: <strong style={{ color: '#2563eb' }}>₹{totalCheque.toFixed(2)}</strong></div>
        </div>
      </div>

      {/* Cash Scroll Book Register Table matching Document #662 */}
      <div className="table-responsive">
        <table className="table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 100 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
              <th style={{ width: 80 }}>{lang === 'mr' ? 'पान क्र.' : 'Page No.'}</th>
              <th style={{ width: 110 }}>{lang === 'mr' ? 'व्हाऊचर/B Cash' : 'V. / B Cash No.'}</th>
              <th>{lang === 'mr' ? 'कोणाकडून आले व दिले' : 'From Received and Paid'}</th>
              <th style={{ textAlign: 'right', color: '#16a34a' }}>{lang === 'mr' ? 'जमा (Received ₹)' : 'Received Amount (₹)'}</th>
              <th style={{ textAlign: 'right', color: '#dc2626' }}>{lang === 'mr' ? 'नावे (Paid ₹)' : 'Paid Amount (₹)'}</th>
              <th style={{ textAlign: 'right', color: '#2563eb' }}>{lang === 'mr' ? 'चेक (Cheque ₹)' : 'Cheque Amount (₹)'}</th>
              <th style={{ textAlign: 'center', width: 60 }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {history.filter(h => h.from_received_paid.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'mr' ? 'निवडलेल्या दिनांकासाठी कोणत्याही स्क्रोल नोंदी नाहीत.' : 'No cash scroll entries found for this date.'}
                </td>
              </tr>
            ) : (
              history
                .filter(h => h.from_received_paid.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.page_no || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{row.voucher_no || '-'}</td>
                    <td>{row.from_received_paid}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>₹{Number(row.received_amount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>₹{Number(row.paid_amount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>₹{Number(row.cheque_amount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
          {history.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--surface-subtle)', fontWeight: 700 }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>Total Daily Cash Scroll:</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{totalReceived.toFixed(2)}</td>
                <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{totalPaid.toFixed(2)}</td>
                <td style={{ textAlign: 'right', color: '#2563eb' }}>₹{totalCheque.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Printable Cash Scroll Book Modal matching Document #662 */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 850, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'रोख स्क्रोल पुस्तक मुद्रण' : 'Cash Scroll Book Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Document #662 layout */}
            <div className="printable-scroll-book" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  {office?.office_name || 'BELGAUM GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM'}
                </h3>
                <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6, textDecoration: 'underline' }}>
                  CASH SCROLL BOOK REGISTER
                </div>
                <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>
                  Date: {date}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Page No.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>V. / B Cash No.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>From Received and Paid (Particulars)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Received (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Paid (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Cheque (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 12, fontStyle: 'italic' }}>No entries found</td></tr>
                  ) : (
                    history.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.page_no || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.voucher_no || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.from_received_paid}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(row.received_amount || 0).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(row.paid_amount || 0).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(row.cheque_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={4} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL:</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{totalReceived.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{totalPaid.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{totalCheque.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Clerk's Signature<br /><br />_______________</div>
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

export default CashScrollBookForm;
