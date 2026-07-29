import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckCircle2, AlertCircle, Printer, Search } from 'lucide-react';
import { createChequeIssueEntry, fetchChequeIssueEntries, deleteChequeIssueEntry } from '../../api/client';
import type { ChequeIssueBookEntry, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface ChequeIssueBookFormProps {
  user?: User | null;
}

const ChequeIssueBookForm: React.FC<ChequeIssueBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [issueDate, setIssueDate] = useState(today);
  const [nameToWhomIssued, setNameToWhomIssued] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [amountRs, setAmountRs] = useState<string>('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ChequeIssueBookEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await fetchChequeIssueEntries();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setIssueDate(today);
    setNameToWhomIssued('');
    setChequeNo('');
    setAmountRs('');
    setRemarks('');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameToWhomIssued.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया चेक कोणाला दिला त्यांचे नाव प्रविष्ट करा.' : 'Please enter Name to whom issued.' });
      return;
    }
    if (!chequeNo.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया चेक क्रमांक प्रविष्ट करा.' : 'Please enter Cheque Number.' });
      return;
    }
    const amt = parseFloat(amountRs);
    if (isNaN(amt) || amt <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'अमान्य रक्कम.' : 'Invalid Amount.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await createChequeIssueEntry({
        issue_date: issueDate,
        name_to_whom_issued: nameToWhomIssued.trim(),
        cheque_no: chequeNo.trim(),
        amount_rs: amt,
        remarks: remarks.trim(),
        created_by: user?.username || 'cashier',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? `चेक क्र. ${chequeNo} ची नोंद यशस्वीरित्या जोडली!` : `Cheque No. ${chequeNo} issued successfully!`
      });
      loadEntries();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'चेक नोंद जतन करताना त्रुटी आली.' : 'Error saving cheque issue entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही चेक नोंद हटवायची आहे का?' : 'Are you sure you want to delete this cheque issue entry?')) return;
    try {
      await deleteChequeIssueEntry(id);
      loadEntries();
    } catch {
      // ignore
    }
  };

  const filteredHistory = history.filter(row =>
    row.name_to_whom_issued.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.cheque_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalIssuedAmount = filteredHistory.reduce((sum, r) => sum + Number(r.amount_rs), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            5. {lang === 'mr' ? 'चेक देणे नोंद पुस्तक (Cheque Issue Book)' : 'Cheque Issue Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'संस्थेने वितरित केलेल्या सर्व धनादेशांचे (Cheques) रजिस्टर' : 'Register of all cheques issued by the Society'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> {lang === 'mr' ? 'चेक रजिस्टर प्रिंट' : 'Print Cheque Register'}
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Entry Form matching Image #0 */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          {lang === 'mr' ? 'नवीन चेक वाटप नोंद' : 'Record New Cheque Issue'}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'वाटप दिनांक (Date of Issue)' : 'Date of Issue'}</label>
            <input type="date" className="form-input" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'कोणाच्या नावे दिला (Name to whom Issued)' : 'Name to whom Issued'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'व्यक्तीचे किंवा संस्थेचे नाव' : 'Name of recipient person / entity'}
              value={nameToWhomIssued}
              onChange={e => setNameToWhomIssued(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'चेक क्र. (Ch. No.)' : 'Cheque No. (Ch. No.)'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 468102"
              value={chequeNo}
              onChange={e => setChequeNo(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'रक्कम ₹ (Amount Rs.)' : 'Amount (₹)'}</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={amountRs}
              onChange={e => setAmountRs(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'शेरा / हेतू (Remarks / Purpose)' : 'Remarks / Purpose'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'उदा. बँक खाते विवरण, पुरवठादार पेमेंट' : 'e.g. Vendor payment, Bank withdrawal'}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            <Save size={15} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'चेक नोंद जतन करा' : 'Save Cheque Entry')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* History Register matching Image #0 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {lang === 'mr' ? 'दिलेले चेक रजिस्टर (Cheque Issue Register)' : 'Cheque Issue Book Register'}
          </h4>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 28, fontSize: 13 }}
              placeholder={lang === 'mr' ? 'चेक क्र. किंवा नावाने शोधा...' : 'Search Cheque No or Name...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="printable-cheque-book table-responsive" style={{ border: '2px solid #000', padding: 12, background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid #000', paddingBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
              The Belgaum Gardeners Co-op. Pro. Supply & Sale Society Ltd., Belgaum.
            </h3>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', margin: '4px 0 0' }}>
              CHEQUE ISSUE BOOK
            </h4>
          </div>

          <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Date of Encl. / Issue</th>
                <th style={{ border: '1px solid #000', padding: 6 }}>Name to whom Issued</th>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Ch. No.</th>
                <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Amount (Rs. | Ps.)</th>
                <th style={{ border: '1px solid #000', padding: 6 }}>Remarks</th>
                <th className="no-print" style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 16, fontStyle: 'italic', color: '#666' }}>
                    {lang === 'mr' ? 'कोणत्याही चेक नोंदी आढळल्या नाहीत.' : 'No cheque issue records found.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>{row.issue_date}</td>
                    <td style={{ border: '1px solid #000', padding: 6, fontWeight: 600 }}>{row.name_to_whom_issued}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center', fontWeight: 'bold' }}>{row.cheque_no}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                      ₹{Number(row.amount_rs).toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{row.remarks || '-'}</td>
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
                <td colSpan={3} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL CHEQUES ISSUED AMOUNT:</td>
                <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', color: '#2563eb' }}>₹{totalIssuedAmount.toFixed(2)}</td>
                <td colSpan={2} style={{ border: '1px solid #000' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChequeIssueBookForm;
