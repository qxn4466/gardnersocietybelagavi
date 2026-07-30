import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { createChequeIssueEntry, fetchChequeIssueEntries, deleteChequeIssueEntry, fetchOffice, generate30DaysCashierTestData, delete30DaysCashierTestData } from '../../api/client';
import type { ChequeIssueBookEntry, User, OfficeMaster } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';


interface ChequeIssueBookFormProps {
  user?: User | null;
}

const ChequeIssueBookForm: React.FC<ChequeIssueBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [nameToWhomIssued, setNameToWhomIssued] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ChequeIssueBookEntry[]>([]);
  const [office, setOffice] = useState<OfficeMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
    loadOffice();
  }, []);

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
      const data = await fetchChequeIssueEntries();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setDate(today);
    setNameToWhomIssued('');
    setChequeNo('');
    setAmount('');
    setRemarks('');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameToWhomIssued.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ज्यांच्या नावावर चेक दिला त्यांचे नाव प्रविष्ट करा.' : 'Please enter Name to whom Issued.' });
      return;
    }
    if (!chequeNo.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया चेक क्रमांक प्रविष्ट करा.' : 'Please enter Cheque Number.' });
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया अमान्य रक्कम.' : 'Please enter valid Amount.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await createChequeIssueEntry({
        issue_date: date,
        name_to_whom_issued: nameToWhomIssued.trim(),
        cheque_no: chequeNo.trim(),
        amount_rs: amt,
        remarks: remarks.trim() || undefined,
        created_by: user?.username || 'cashier',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'चेक नोंद यशस्वीरित्या जतन केली!' : 'Cheque issue entry saved successfully!'
      });
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'चेक नोंद जतन करताना त्रुटी आली.' : 'Error saving cheque issue entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this cheque entry?')) return;
    try {
      await deleteChequeIssueEntry(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const filteredHistory = history.filter(h =>
    h.name_to_whom_issued.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.cheque_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalChequeAmount = filteredHistory.reduce((s, r) => s + Number(r.amount_rs || 0), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            5. {lang === 'mr' ? 'चेक देणे नोंद पुस्तक (Cheque Issue Book)' : 'Cheque Issue Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'व्हाऊचर, बिल व इनव्हॉईस चेक पेमेंटमधून स्वयंचलित नोंदवणारी चेक नोंदवही' : 'Cheque Register auto-updated from Cheque Payment Vouchers & Invoices'}
          </p>
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
            <Printer size={14} /> {lang === 'mr' ? 'चेक पुस्तक प्रिंट करा' : 'Print Cheque Book'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          {lang === 'mr' ? 'हस्ते चेक नोंद जोडा (Manual Cheque Entry)' : 'Add Manual Cheque Entry'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक' : 'Date of Issue / Encl.'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'ज्यांच्या नावावर दिला (Name to whom Issued)' : 'Name to whom Issued'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'व्यक्तीचे किंवा कंपनीचे नाव' : 'Person or party name'}
              value={nameToWhomIssued}
              onChange={e => setNameToWhomIssued(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'चेक क्र. (Ch. No.)' : 'Cheque No. (Ch. No.)'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 048291"
              value={chequeNo}
              onChange={e => setChequeNo(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'रक्कम ₹ (Amount)' : 'Amount (₹)'}</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{ fontWeight: 600, color: '#ea580c' }}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'रिमार्क्स / तपशील' : 'Remarks'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Bank payment"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
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

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: 300 }}
          placeholder={lang === 'mr' ? 'चेक क्र. किंवा नावाने शोधा...' : 'Search by Cheque No or Name...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {lang === 'mr' ? 'एकूण दिलेले चेक रक्कम:' : 'Total Cheques Issued:'} <span style={{ color: '#ea580c' }}>₹{totalChequeAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Cheque Issue Book Table matching Document #468 */}
      <div className="table-responsive">
        <table className="table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>{lang === 'mr' ? 'दिनांक' : 'Date of Issue / Encl.'}</th>
              <th>{lang === 'mr' ? 'ज्यांच्या नावावर दिला' : 'Name to whom Issued'}</th>
              <th style={{ width: 130, textAlign: 'center' }}>{lang === 'mr' ? 'चेक क्र. (Ch. No.)' : 'Cheque No. (Ch. No.)'}</th>
              <th style={{ textAlign: 'right', color: '#ea580c', width: 140 }}>{lang === 'mr' ? 'रक्कम ₹ (Rs.)' : 'Amount (Rs. Ps.)'}</th>
              <th>{lang === 'mr' ? 'रिमार्क्स' : 'Remarks'}</th>
              <th style={{ textAlign: 'center', width: 60 }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'mr' ? 'कोणत्याही चेक नोंदी नाहीत.' : 'No cheque issue entries found.'}
                </td>
              </tr>
            ) : (
              filteredHistory.map(row => (
                <tr key={row.id}>
                  <td>{row.issue_date}</td>
                  <td style={{ fontWeight: 600 }}>{row.name_to_whom_issued}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{row.cheque_no}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#ea580c' }}>₹{Number(row.amount_rs || 0).toFixed(2)}</td>
                  <td>{row.remarks || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredHistory.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--surface-subtle)', fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: 'right' }}>Total Cheques Issued:</td>
                <td style={{ textAlign: 'right', color: '#ea580c' }}>₹{totalChequeAmount.toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Printable Cheque Issue Book Modal matching Document #468 */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 850, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>{lang === 'mr' ? 'चेक देणे पुस्तक मुद्रण' : 'Cheque Issue Book Print'}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  {lang === 'mr' ? 'बंद करा' : 'Close'}
                </button>
              </div>
            </div>

            {/* Print Container matching Document #468 layout */}
            <div className="printable-cheque-book" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  {office?.office_name || 'BELAGAVI GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELAGAVI'}
                </h3>
                <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6, textDecoration: 'underline' }}>
                  CHEQUE ISSUE REGISTER
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date of Issue / Encl.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Name to whom Issued</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Ch. No.</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Amount (Rs. Ps.)</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 12, fontStyle: 'italic' }}>No entries found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.issue_date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.name_to_whom_issued}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center', fontWeight: 'bold' }}>{row.cheque_no}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{Number(row.amount_rs || 0).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL CHEQUES ISSUED:</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{totalChequeAmount.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}></td>
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

export default ChequeIssueBookForm;
