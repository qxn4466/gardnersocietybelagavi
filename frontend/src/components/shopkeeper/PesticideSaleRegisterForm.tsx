import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPesticideSale, fetchPesticideSales, deletePesticideSale } from '../../api/client';
import type { PesticideSaleEntry, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface PesticideSaleRegisterFormProps {
  user?: User | null;
}

const PesticideSaleRegisterForm: React.FC<PesticideSaleRegisterFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('Boric Acid');
  const [qty, setQty] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [batchNo, setBatchNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const [amount, setAmount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<PesticideSaleEntry[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [date]);

  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    setAmount(q * r);
  }, [qty, rate]);

  const loadHistory = async () => {
    try {
      const data = await fetchPesticideSales(date, date);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setProductName('Boric Acid');
    setQty('1');
    setRate('');
    setBatchNo('');
    setRemarks('');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer Name.' });
      return;
    }
    if (amount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया प्रमाण व दर प्रविष्ट करा.' : 'Please enter Qty and Rate.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      await createPesticideSale({
        date,
        customer_name: customerName.trim(),
        product_name: productName,
        qty: parseFloat(qty) || 1,
        rate: parseFloat(rate) || 0,
        amount,
        batch_no: batchNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        created_by: user?.username || 'shopkeeper',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'कीटकनाशक नोंदणी पुस्तक नोंद जतन झाली!' : 'Pesticide sale register entry saved successfully!'
      });
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'नोंद जतन करताना त्रुटी आली.' : 'Error saving pesticide sale entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this entry?')) return;
    try {
      await deletePesticideSale(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  // Group pesticide sales by product columns for Specification 4 Grid
  const productsTotal = PESTICIDE_PRODUCT_LIST.map(prod => {
    const totalQty = history.filter(h => h.product_name === prod).reduce((s, h) => s + Number(h.qty || 0), 0);
    const totalAmt = history.filter(h => h.product_name === prod).reduce((s, h) => s + Number(h.amount || 0), 0);
    return { name: prod, qty: totalQty, amount: totalAmt };
  });

  const grandTotalAmount = history.reduce((s, h) => s + Number(h.amount || 0), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            4. {lang === 'mr' ? 'कीटकनाशके विक्री नोंदवही (Pesticide Sale Register)' : 'Pesticide Sale Register'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'बोरीक ॲसिड व इतर कीटकनाशके उत्पादनांचा दैनंदिन नोंदवही तक्ता' : 'Daily sales grid for Boric Acid & Pesticides'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={14} /> {lang === 'mr' ? 'नोंदवही प्रिंट करा' : 'Print Register'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन नोंद' : 'New Sale Entry'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'ग्राहक नाव (Customer Name)' : 'Customer Name'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'ग्राहकाचे नाव' : 'Customer name'}
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'कीटकनाशक उत्पादन नाव' : 'Pesticide Product Name'}</label>
            <select className="form-input" value={productName} onChange={e => setProductName(e.target.value)}>
              {PESTICIDE_PRODUCT_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Qty</label>
            <input type="number" step="0.1" className="form-input" value={qty} onChange={e => setQty(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Rate (₹)</label>
            <input type="number" step="0.01" className="form-input" value={rate} onChange={e => setRate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Total (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{ fontWeight: 700, color: '#16a34a', background: '#f0fdf4' }}
              value={amount.toFixed(2)}
              readOnly
            />
          </div>
          <div className="form-group">
            <label className="form-label">Batch No / Ref</label>
            <input type="text" className="form-input" placeholder="e.g. B-902" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            <Save size={14} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'नोंद जतन करा' : 'Save Pesticide Sale')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Product Summary Grid matching Specification 4 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          {lang === 'mr' ? 'दैनंदिन उत्पादननिहाय विक्री तक्ता (Product-wise Sales Grid)' : 'Daily Product-wise Sales Grid'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {productsTotal.map(p => (
            <div key={p.name} style={{ background: p.name === 'Boric Acid' ? '#f0fdf4' : '#f8fafc', padding: 10, borderRadius: 6, border: p.name === 'Boric Acid' ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: p.name === 'Boric Acid' ? '#166534' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                {p.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                Qty: {p.qty}
              </div>
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                ₹{p.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History Register */}
      <div className="table-responsive">
        <table className="table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Product Name</th>
              <th>Batch No</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'mr' ? 'निवडलेल्या दिनांकासाठी कोणत्याही कीटकनाशक नोंदी नाहीत.' : 'No pesticide sales found for this date.'}
                </td>
              </tr>
            ) : (
              history.map(row => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                  <td>
                    <span className={`badge ${row.product_name === 'Boric Acid' ? 'badge-primary' : 'badge-secondary'}`}>
                      {row.product_name}
                    </span>
                  </td>
                  <td>{row.batch_no || '-'}</td>
                  <td>{row.qty}</td>
                  <td>₹{Number(row.rate).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.amount).toFixed(2)}</td>
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
                <td colSpan={6} style={{ textAlign: 'right' }}>Grand Daily Sales Total:</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{grandTotalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Printable Register View matching Specification 4 */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 900, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Pesticide Sale Register Print</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            {/* Print Container matching Specification 4 */}
            <div className="printable-pesticide-register" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  The Belgaum Gardeners Co-Op Pro Supply and Sale Society Ltd. Belgaum
                </h3>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  PESTICIDE SALE REGISTER
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Date: {date}</div>
              </div>

              {/* Product Grid Columns */}
              <div style={{ marginBottom: 16, border: '1px solid #000', padding: 10 }}>
                <strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Daily Product Summary:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                  {productsTotal.slice(0, 12).map(p => (
                    <div key={p.name} style={{ borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                      <strong>{p.name}:</strong> Qty {p.qty} (₹{p.amount.toFixed(2)})
                    </div>
                  ))}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Customer Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Product Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Batch No</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    history.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.customer_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>{row.product_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.batch_no || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.qty}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL DAILY PESTICIDE SALES:</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{grandTotalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Shop Keeper Signature<br /><br />_______________</div>
                <div>Auditor Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesticideSaleRegisterForm;
