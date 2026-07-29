import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle2, AlertCircle, Printer, RefreshCw } from 'lucide-react';
import { createCashScrollEntry, fetchCashScrollEntries, deleteCashScrollEntry } from '../../api/client';
import type { CashScrollBookEntry, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface CashScrollBookFormProps {
  user?: User | null;
}

const CashScrollBookForm: React.FC<CashScrollBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [pageNo, setPageNo] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [fromReceivedPaid, setFromReceivedPaid] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [chequeAmount, setChequeAmount] = useState<string>('0');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<CashScrollBookEntry[]>([]);
  const [filterDate, setFilterDate] = useState(today);

  useEffect(() => {
    loadEntries();
  }, [filterDate]);

  const loadEntries = async () => {
    try {
      const data = await fetchCashScrollEntries(filterDate, filterDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setDate(today);
    setPageNo('');
    setVoucherNo('');
    setFromReceivedPaid('');
    setReceivedAmount('0');
    setPaidAmount('0');
    setChequeAmount('0');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromReceivedPaid.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा/नावे विवरण प्रविष्ट करा.' : 'Please enter From Received and Paid description.' });
      return;
    }

    const rec = parseFloat(receivedAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const chq = parseFloat(chequeAmount) || 0;

    if (rec <= 0 && paid <= 0 && chq <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया जमा, नावे किंवा चेक यांपैकी एक तरी रक्कम प्रविष्ट करा.' : 'Please enter Received, Paid, or Cheque amount.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await createCashScrollEntry({
        date,
        page_no: pageNo.trim(),
        voucher_no: voucherNo.trim(),
        from_received_paid: fromReceivedPaid.trim(),
        received_amount: rec,
        paid_amount: paid,
        cheque_amount: chq,
        created_by: user?.username || 'cashier',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'कॅश स्क्रोल बुक नोंद यशस्वीरित्या जोडली!' : 'Cash Scroll Book entry added successfully!'
      });
      loadEntries();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'स्क्रोल नोंद जतन करताना त्रुटी आली.' : 'Error saving cash scroll entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this scroll entry?')) return;
    try {
      await deleteCashScrollEntry(id);
      loadEntries();
    } catch {
      // ignore
    }
  };

  // Totals for current filter
  const totalReceived = history.reduce((sum, r) => sum + Number(r.received_amount), 0);
  const totalPaid = history.reduce((sum, r) => sum + Number(r.paid_amount), 0);
  const totalCheque = history.reduce((sum, r) => sum + Number(r.cheque_amount), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            4. {lang === 'mr' ? 'रोख स्क्रोल पुस्तक (Cash Scroll Book)' : 'Create a Cash Scroll Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'दैनंदिन रोख व चेक जमा-नावे नोंदींचा स्क्रोल बुक रजिस्टर' : 'Daily cash & cheque received and paid scroll book register'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> {lang === 'mr' ? 'स्क्रोल बुक प्रिंट' : 'Print Scroll Book'}
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          {lang === 'mr' ? 'नवीन स्क्रोल नोंद जोडा' : 'Add New Cash Scroll Entry'}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'पान क्र. (Page No.)' : 'Page No.'}</label>
            <input type="text" className="form-input" placeholder="e.g. 662" value={pageNo} onChange={e => setPageNo(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'व्हाऊचर / B.Cash क्र.' : 'V. No. / B Cash No.'}</label>
            <input type="text" className="form-input" placeholder="e.g. V-101" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'कडून जमा व दिले (From Received and Paid)' : 'From Received and Paid'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'व्यक्तीचे / खात्याचे नाव व तपशील' : 'Description / Customer or Party Name'}
              value={fromReceivedPaid}
              onChange={e => setFromReceivedPaid(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#16a34a' }}>{lang === 'mr' ? 'प्राप्त रक्कम ₹ (Received Amount)' : 'Received Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: '#dc2626' }}>{lang === 'mr' ? 'दिलेली रक्कम ₹ (Paid Amount)' : 'Paid Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: '#2563eb' }}>{lang === 'mr' ? 'चेक रक्कम ₹ (Cheque Amount)' : 'Cheque Amount (₹)'}</label>
            <input type="number" step="0.01" className="form-input" value={chequeAmount} onChange={e => setChequeAmount(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            <Plus size={15} /> {loading ? (lang === 'mr' ? 'जोडत आहे...' : 'Adding...') : (lang === 'mr' ? 'स्क्रोल नोंद जोडा' : 'Add Scroll Entry')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Date Filter & Table Register */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {lang === 'mr' ? 'कॅश स्क्रोल बुक नोंद वही' : 'Cash Scroll Book Register'}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'दिनांक निवडा:' : 'Select Date:'}</label>
            <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 13 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={loadEntries} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Scroll Book Table matching Image #2 */}
        <div className="printable-scroll-book table-responsive" style={{ border: '2px solid #000', padding: 12, background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid #000', paddingBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
              The Belgaum Gardeners Co-op. Pro. Supply & Sale Society Ltd., Belgaum
            </h3>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', margin: '4px 0 0' }}>
              CASH SCROLL BOOK — Date: {filterDate}
            </h4>
          </div>

          <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: 6 }}>B Cash No. / Page / V. No.</th>
                <th style={{ border: '1px solid #000', padding: 6 }}>From Received and Paid</th>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Received Amount (₹)</th>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Paid Amount (₹)</th>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Cheque Amount (₹)</th>
                <th className="no-print" style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 16, fontStyle: 'italic', color: '#666' }}>
                    {lang === 'mr' ? 'या तारखेसाठी कोणतीही नोंद आढळली नाही.' : 'No cash scroll entries for this date.'}
                  </td>
                </tr>
              ) : (
                history.map(row => (
                  <tr key={row.id}>
                    <td style={{ border: '1px solid #000', padding: 6, fontWeight: 600 }}>
                      {row.page_no ? `P:${row.page_no} ` : ''}{row.voucher_no ? `V:${row.voucher_no}` : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{row.from_received_paid}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      ₹{Number(row.received_amount).toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                      ₹{Number(row.paid_amount).toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                      ₹{Number(row.cheque_amount).toFixed(2)}
                    </td>
                    <td className="no-print" style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #000' }}>
                <td colSpan={2} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL:</td>
                <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', color: '#16a34a' }}>₹{totalReceived.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', color: '#dc2626' }}>₹{totalPaid.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', color: '#2563eb' }}>₹{totalCheque.toFixed(2)}</td>
                <td className="no-print" style={{ border: '1px solid #000' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashScrollBookForm;
