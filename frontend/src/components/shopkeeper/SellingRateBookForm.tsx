import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createSellingRateEntry, fetchSellingRateEntries, deleteSellingRateEntry } from '../../api/client';
import type { ShopSellingRateEntry, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface SellingRateBookFormProps {
  user?: User | null;
}

const SellingRateBookForm: React.FC<SellingRateBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [particulars, setParticulars] = useState(PESTICIDE_PRODUCT_LIST[0]);
  const [customParticulars, setCustomParticulars] = useState('');
  const [qty, setQty] = useState<string>('1');
  const [amount, setAmount] = useState<string>('');
  const [sgst, setSgst] = useState<string>('0');
  const [cgst, setCgst] = useState<string>('0');
  const [hmall, setHmall] = useState<string>('0');
  const [motorRent, setMotorRent] = useState<string>('0');
  const [stockBookNo, setStockBookNo] = useState('');
  const [signStatus, setSignStatus] = useState('Signed');

  // Calculated fields
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [netRate, setNetRate] = useState<number>(0);
  const [sellingRate, setSellingRate] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopSellingRateEntry[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [date]);

  useEffect(() => {
    const q = parseFloat(qty) || 1;
    const baseAmt = parseFloat(amount) || 0;
    const sgstAmt = parseFloat(sgst) || 0;
    const cgstAmt = parseFloat(cgst) || 0;
    const hmallAmt = parseFloat(hmall) || 0;
    const rentAmt = parseFloat(motorRent) || 0;

    const total = baseAmt + sgstAmt + cgstAmt + hmallAmt + rentAmt;
    setTotalAmount(total);

    const net = q > 0 ? total / q : 0;
    setNetRate(net);

    // Default selling rate = Net rate + 5% margin
    setSellingRate(net > 0 ? Math.ceil(net * 1.05) : 0);
  }, [qty, amount, sgst, cgst, hmall, motorRent]);

  const loadHistory = async () => {
    try {
      const data = await fetchSellingRateEntries();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setDate(today);
    setName('');
    setParticulars(PESTICIDE_PRODUCT_LIST[0]);
    setCustomParticulars('');
    setQty('1');
    setAmount('');
    setSgst('0');
    setCgst('0');
    setHmall('0');
    setMotorRent('0');
    setStockBookNo('');
    setSignStatus('Signed');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer / Member Name.' });
      return;
    }
    if (totalAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'अमान्य रक्कम.' : 'Please enter valid Amount.' });
      return;
    }

    const finalParticulars = customParticulars.trim()
      ? `${particulars} (${customParticulars.trim()})`
      : particulars;

    setLoading(true);
    setMsg(null);
    try {
      await createSellingRateEntry({
        date,
        name: name.trim(),
        particulars: finalParticulars,
        qty: parseFloat(qty) || 1,
        amount: parseFloat(amount) || 0,
        sgst: parseFloat(sgst) || 0,
        cgst: parseFloat(cgst) || 0,
        hmall: parseFloat(hmall) || 0,
        motor_rent: parseFloat(motorRent) || 0,
        total_amount: totalAmount,
        net_rate: netRate,
        selling_rate: sellingRate,
        stock_book_no: stockBookNo.trim() || undefined,
        sign_status: signStatus,
        created_by: user?.username || 'shopkeeper',
      });

      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'विक्री दर पुस्तक नोंद यशस्वीरित्या जतन केली!' : 'Selling rate book entry saved successfully!'
      });
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'नोंद जतन करताना त्रुटी आली.' : 'Error saving selling rate book entry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला ही नोंद हटवायची आहे का?' : 'Are you sure you want to delete this entry?')) return;
    try {
      await deleteSellingRateEntry(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            1. {lang === 'mr' ? 'बियाणे, कीटकनाशके, स्प्रेपंप व इतर विक्री दर पुस्तक' : 'Seeds, Pesticides, Spraypump and Other Selling Rate Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'दुकान विक्री दर, हमाली, मोटार भाडे, SGST/CGST व स्टॉक पुस्तक नोंद' : 'Record product cost breakdown, taxes, motor rent & selling rate'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={14} /> {lang === 'mr' ? 'प्रिंट करा' : 'Print'}
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

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'नाव (Customer / Member Name)' : 'Name'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'ग्राहकाचे / सदस्याचे नाव' : 'Customer or member name'}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'तपशील (Particulars)' : 'Particulars'}</label>
            <select className="form-input" value={particulars} onChange={e => setParticulars(e.target.value)}>
              {PESTICIDE_PRODUCT_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'अतिरिक्त तपशील / ग्रेड' : 'Custom Ref / Grade'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 500ml bottle"
              value={customParticulars}
              onChange={e => setCustomParticulars(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'नग / प्रमाण (Qty)' : 'Qty'}</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Cost Breakdown Grid matching User Request Grid 1 */}
        <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            {lang === 'mr' ? 'रक्कम व कर तपशील (Cost, Tax & Charges Breakdown)' : 'Cost, Tax & Charges Breakdown'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{lang === 'mr' ? 'मूळ रक्कम ₹ (Amount)' : 'Base Amount (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SGST ₹</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={sgst}
                onChange={e => setSgst(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CGST ₹</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={cgst}
                onChange={e => setCgst(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'mr' ? 'हमाली ₹ (HMall)' : 'HMall (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={hmall}
                onChange={e => setHmall(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'mr' ? 'मोटार भाडे ₹ (Motor Rent)' : 'Motor Rent (₹)'}</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={motorRent}
                onChange={e => setMotorRent(e.target.value)}
              />
            </div>
          </div>

          {/* Calculated Output Row */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Total Amount:</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#16a34a' }}>₹{totalAmount.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Net Rate / Unit:</span>
              <div style={{ fontWeight: 600 }}>₹{netRate.toFixed(2)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Selling Rate:</span>
              <div style={{ fontWeight: 700, color: '#2563eb' }}>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  style={{ width: 110, display: 'inline-block', fontWeight: 700 }}
                  value={sellingRate}
                  onChange={e => setSellingRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Stock Book No:</span>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SB-104"
                value={stockBookNo}
                onChange={e => setStockBookNo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'दर पुस्तक नोंद जतन करा' : 'Save Rate Entry')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* History Register Table matching Grid 1 */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          {lang === 'mr' ? 'अलीकडील विक्री दर पुस्तक नोंदी' : 'Recent Selling Rate Book Entries'}
        </h4>
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {lang === 'mr' ? 'कोणत्याही दर पुस्तक नोंदी आढळल्या नाहीत.' : 'No rate book entries found.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Particulars</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>SGST</th>
                  <th>CGST</th>
                  <th>HMall</th>
                  <th>Motor Rent</th>
                  <th style={{ color: '#16a34a' }}>Total Amount</th>
                  <th>Net Rate</th>
                  <th style={{ color: '#2563eb' }}>Selling Rate</th>
                  <th>Stock Book No.</th>
                  <th>Sign</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td>{row.particulars}</td>
                    <td>{row.qty}</td>
                    <td>₹{Number(row.amount).toFixed(2)}</td>
                    <td>₹{Number(row.sgst).toFixed(2)}</td>
                    <td>₹{Number(row.cgst).toFixed(2)}</td>
                    <td>₹{Number(row.hmall).toFixed(2)}</td>
                    <td>₹{Number(row.motor_rent).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                    <td>₹{Number(row.net_rate).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#2563eb' }}>₹{Number(row.selling_rate).toFixed(2)}</td>
                    <td>{row.stock_book_no || '-'}</td>
                    <td>{row.sign_status || 'Signed'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Register Modal */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 950, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Selling Rate Book Print</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-rate-book" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  THE BELGAUM GARDENERS CO-OP PRO SUPPLY AND SALE SOCIETY LTD. BELGAUM
                </h3>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  SEEDS, PESTICIDES, SPRAYPUMP AND OTHER SELLING RATE BOOK
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Name</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Particulars</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Amount</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>SGST</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>CGST</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>HMall</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Motor Rent</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Total Amount</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Net Rate</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Selling Rate</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Stock Book No.</th>
                    <th style={{ border: '1px solid #000', padding: 4 }}>Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={14} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    history.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.name}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.particulars}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.qty}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.amount).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.sgst).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.cgst).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.hmall).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.motor_rent).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 'bold' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>₹{Number(row.net_rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4, fontWeight: 'bold' }}>₹{Number(row.selling_rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.stock_book_no || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 4 }}>{row.sign_status || 'Signed'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Shop Keeper Signature<br /><br />_______________</div>
                <div>Accountant Signature<br /><br />_______________</div>
                <div>Manager Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellingRateBookForm;
