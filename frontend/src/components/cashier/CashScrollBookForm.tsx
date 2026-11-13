import React, { useState, useEffect } from 'react';
import { Printer, Trash2, CheckCircle2, AlertCircle, Zap, Calendar, Search, BookOpen, Loader2, Info } from 'lucide-react';
import { fetchCashScrollEntries, deleteCashScrollEntry, fetchOffice, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import type { CashScrollBookEntry, User, OfficeMaster } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import DailyBalanceBar from '../DailyBalanceBar';

interface CashScrollBookFormProps {
  user?: User | null;
}

/**
 * Cash Scroll Book — Register only (no manual entry form).
 * Entries are auto-filled from:
 *   1. Credit-Debit Account Form (POSTED transactions; CASH -> Received/Paid, CHEQUE -> Cheque column)
 *   2. Rent Bill Form (cash rent receipts; cheque rent bills go to the Cheque column)
 * This book therefore contains CASH transactions only and cannot be typed into manually.
 */
const CashScrollBookForm: React.FC<CashScrollBookFormProps> = () => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Date Filter & Search
  const [startDateFilter, setStartDateFilter] = useState(thirtyDaysAgo);
  const [endDateFilter, setEndDateFilter] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
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

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this entry?')) return;
    try {
      await deleteCashScrollEntry(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const filteredHistory = history.filter(h => h.from_received_paid.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalReceived = history.reduce((s, r) => s + Number(r.received_amount || 0), 0);
  const totalPaid = history.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const totalCheque = history.reduce((s, r) => s + Number(r.cheque_amount || 0), 0);

  return (
    <div>
      <DailyBalanceBar selectedDate={endDateFilter} />

      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* General Ledger Card Table */}
      <div className="card" style={{ borderTop: '4px solid #4f46e5', boxShadow: '0 4px 24px rgba(79, 70, 229, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: '#fff', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#dbeafe', padding: 8, borderRadius: 8, color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {lang === 'mr' ? 'रोख स्क्रोल पुस्तक नोंदवही' : 'Cash Scroll Book Register'}
              </h4>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {lang === 'mr' ? 'फक्त रोख व्यवहार — स्वयंचलित नोंदी' : 'Cash transactions only — auto-filled entries'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="filter-bar-group" style={{ fontSize: 13, gap: 16 }}>
              <div>Rec: <strong style={{ color: '#16a34a', fontFamily: 'monospace' }}>₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div>Paid: <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div>Cheque: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>₹{totalCheque.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
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
              <Trash2 size={14} /> {lang === 'mr' ? 'चाचणी डेटा हटवा' : 'Delete Test Data'}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>
              <Printer size={14} /> {lang === 'mr' ? 'स्क्रोल प्रिंट' : 'Print Scroll'}
            </button>
          </div>
        </div>

        <div className="no-print" style={{
          padding: '12px 18px',
          background: '#eff6ff',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <Info size={16} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12.5, color: '#1e40af', fontWeight: 600, lineHeight: 1.5 }}>
            {lang === 'mr'
              ? 'हे नोंदवही फक्त रोख (Cash) व्यवहारांसाठी आहे. येथे फील्ड मॅन्युअली भरली जात नाहीत — नोंदी स्वयंचलितपणे खालील फॉर्ममधून येतात: १) जमा-नावे खाते फॉर्म (Credit-Debit Account Form) २) भाडे बिल फॉर्म (Rent Bill). रोख जमा "जमा" रकान्यात, रोख नावे "नावे" रकान्यात व चेक व्यवहार "चेक" रकान्यात दिसतात.'
              : 'This register is for CASH transactions only — fields are not typed in manually. Entries are auto-filled from: 1) the Credit-Debit Account Form and 2) the Rent Bill Form. Cash receipts appear under Received, cash payments under Paid, and cheque transactions under the Cheque column.'}
          </span>
        </div>

        <div className="no-print" style={{
          padding: '12px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid var(--border-subtle)',
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
            <input type="text" className="form-input" style={{ width: 220, padding: '4px 8px', fontSize: 13 }} placeholder={lang === 'mr' ? 'शोधा (तपशील)...' : 'Search particulars...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="table-wrapper">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">
                {lang === 'mr' ? 'निवडलेल्या दिनांकासाठी कोणत्याही स्क्रोल नोंदी नाहीत' : 'No cash scroll entries found for this date'}
              </div>
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th style={{ width: 80 }}>{lang === 'mr' ? 'पान क्र.' : 'Page No.'}</th>
                  <th style={{ width: 130 }}>{lang === 'mr' ? 'व्हाऊचर/B Cash' : 'V. / B Cash No.'}</th>
                  <th>{lang === 'mr' ? 'कोणाकडून आले व दिले (Particulars)' : 'From Received and Paid'}</th>
                  <th style={{ textAlign: 'right', color: '#16a34a', width: 130 }}>{lang === 'mr' ? 'जमा (Received ₹)' : 'Received (₹)'}</th>
                  <th style={{ textAlign: 'right', color: '#dc2626', width: 130 }}>{lang === 'mr' ? 'नावे (Paid ₹)' : 'Paid (₹)'}</th>
                  <th style={{ textAlign: 'right', color: '#2563eb', width: 130 }}>{lang === 'mr' ? 'चेक (Cheque ₹)' : 'Cheque (₹)'}</th>
                  <th style={{ textAlign: 'center', width: 60 }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderLeft: '3px solid #4f46e5',
                    }}
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row.date}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.page_no || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-brand)', fontFamily: 'monospace' }}>{row.voucher_no || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{row.from_received_paid}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.received_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>₹{Number(row.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>₹{Number(row.cheque_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} title="Delete Entry">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {history.length > 0 && (
                <tfoot>
                  <tr style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                    color: '#fff', fontWeight: 800, fontSize: 13,
                  }}>
                    <td colSpan={4} style={{ color: '#c7d2fe', padding: '10px 14px', fontWeight: 700 }}>
                      TOTAL DAILY CASH SCROLL:
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#86efac', fontSize: 14, fontWeight: 800 }}>
                      ₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fca5a5', fontSize: 14, fontWeight: 800 }}>
                      ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#93c5fd', fontSize: 14, fontWeight: 800 }}>
                      ₹{totalCheque.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
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
                  Period: {startDateFilter} to {endDateFilter}
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
