import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, Search } from 'lucide-react';
import { createSellingRateEntry, fetchSellingRateEntries, deleteSellingRateEntry } from '../../api/client';
import type { ShopSellingRateEntry, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface SellingRateBookFormProps {
  user?: User | null;
}

interface SellingRateRow {
  id: string;
  particulars: string;
  qty: number;
  amount: number;
  sgst: number;
  cgst: number;
  hmall: number;
  motor_rent: number;
  total_amount: number;
  net_rate: number;
  selling_rate: number;
}

const SellingRateBookForm: React.FC<SellingRateBookFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [stockBookNo, setStockBookNo] = useState('');
  const [signStatus, setSignStatus] = useState('Signed');

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-item addable grid rows
  const [items, setItems] = useState<SellingRateRow[]>([
    {
      id: '1',
      particulars: PESTICIDE_PRODUCT_LIST[0],
      qty: 1,
      amount: 0,
      sgst: 0,
      cgst: 0,
      hmall: 0,
      motor_rent: 0,
      total_amount: 0,
      net_rate: 0,
      selling_rate: 0,
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopSellingRateEntry[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  const loadHistory = async () => {
    try {
      const data = await fetchSellingRateEntries(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const updateRow = (index: number, field: keyof SellingRateRow, val: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: val };

    const q = parseFloat(String(row.qty)) || 1;
    const baseAmt = parseFloat(String(row.amount)) || 0;
    const sgstAmt = parseFloat(String(row.sgst)) || 0;
    const cgstAmt = parseFloat(String(row.cgst)) || 0;
    const hmallAmt = parseFloat(String(row.hmall)) || 0;
    const rentAmt = parseFloat(String(row.motor_rent)) || 0;

    const total = baseAmt + sgstAmt + cgstAmt + hmallAmt + rentAmt;
    row.total_amount = total;

    const net = q > 0 ? total / q : 0;
    row.net_rate = net;

    if (field !== 'selling_rate') {
      row.selling_rate = net > 0 ? Math.ceil(net * 1.05) : 0;
    }

    updated[index] = row;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        particulars: PESTICIDE_PRODUCT_LIST[0],
        qty: 1,
        amount: 0,
        sgst: 0,
        cgst: 0,
        hmall: 0,
        motor_rent: 0,
        total_amount: 0,
        net_rate: 0,
        selling_rate: 0,
      }
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((s, r) => s + (r.total_amount || 0), 0);

  const handleReset = () => {
    setDate(today);
    setName('');
    setStockBookNo('');
    setSignStatus('Signed');
    setItems([
      {
        id: '1',
        particulars: PESTICIDE_PRODUCT_LIST[0],
        qty: 1,
        amount: 0,
        sgst: 0,
        cgst: 0,
        hmall: 0,
        motor_rent: 0,
        total_amount: 0,
        net_rate: 0,
        selling_rate: 0,
      }
    ]);
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer / Member Name.' });
      return;
    }
    if (grandTotal <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया किमान एका बाबीची रक्कम प्रविष्ट करा.' : 'Please enter valid Amount for at least one item.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      for (const item of items) {
        if (item.total_amount > 0) {
          await createSellingRateEntry({
            date,
            name: name.trim(),
            particulars: item.particulars,
            qty: Number(item.qty) || 1,
            amount: Number(item.amount) || 0,
            sgst: Number(item.sgst) || 0,
            cgst: Number(item.cgst) || 0,
            hmall: Number(item.hmall) || 0,
            motor_rent: Number(item.motor_rent) || 0,
            total_amount: item.total_amount,
            net_rate: item.net_rate,
            selling_rate: item.selling_rate,
            stock_book_no: stockBookNo.trim() || undefined,
            sign_status: signStatus,
            created_by: user?.username || 'shopkeeper',
          });
        }
      }

      setMsg({
        type: 'success',
        text: (lang === 'mr' ? 'विक्री दर पुस्तक नोंद जतन केली!' : 'Selling Rate Book entries saved successfully!') +
          (lang === 'mr' ? ' (कीटकनाशके नोंदवहीत स्वयंचलित जोडली गेली)' : ' (Auto-posted to Pesticide Register if applicable)')
      });
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'नोंद जतन करताना त्रुटी आली.' : 'Error saving selling rate book entries.' });
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

  const filteredHistory = history.filter(row =>
    row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.stock_book_no && row.stock_book_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            1. {lang === 'mr' ? 'बियाणे, कीटकनाशके, स्प्रेपंप व इतर विक्री दर पुस्तक' : 'Seeds, Pesticides, Spraypump and Other Selling Rate Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'अनेक बाबी जोडा ("+ Add Item"), दर पुस्तक नोंद, ऑटो-कीटकनाशके नोंद' : 'Multi-item grid with "+ Add Item" button (Auto-posts to Pesticide Register)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={14} /> {lang === 'mr' ? 'महिना / कालावधी रजिस्टर प्रिंट करा' : 'Print Month / Range Register'}
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
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'स्टॉक बुक क्र. (Stock Book No)' : 'Stock Book No.'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. SB-402"
              value={stockBookNo}
              onChange={e => setStockBookNo(e.target.value)}
            />
          </div>
        </div>

        {/* Multi-Item Dynamic Table Grid matching Screenshot */}
        <div style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {lang === 'mr' ? 'उत्पादन दर व खर्च तक्ता (Selling Rate Grid Items)' : 'Selling Rate Grid Items'}
            </h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> {lang === 'mr' ? '+ बाब जोडा (Add Item)' : '+ Add Item'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ width: 35 }}>#</th>
                  <th style={{ minWidth: 160 }}>Particulars</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 90 }}>Base Amt (₹)</th>
                  <th style={{ width: 80 }}>SGST (₹)</th>
                  <th style={{ width: 80 }}>CGST (₹)</th>
                  <th style={{ width: 80 }}>HMall (₹)</th>
                  <th style={{ width: 90 }}>Motor Rent (₹)</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ width: 90 }}>Net Rate</th>
                  <th style={{ width: 100 }}>Selling Rate</th>
                  <th style={{ width: 40, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <select
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.particulars}
                        onChange={e => updateRow(idx, 'particulars', e.target.value)}
                      >
                        {PESTICIDE_PRODUCT_LIST.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.amount || ''}
                        onChange={e => updateRow(idx, 'amount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.sgst || ''}
                        onChange={e => updateRow(idx, 'sgst', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.cgst || ''}
                        onChange={e => updateRow(idx, 'cgst', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.hmall || ''}
                        onChange={e => updateRow(idx, 'hmall', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4 }}
                        value={row.motor_rent || ''}
                        onChange={e => updateRow(idx, 'motor_rent', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      ₹{row.total_amount.toFixed(2)}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      ₹{row.net_rate.toFixed(2)}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: 4, fontWeight: 700, color: '#2563eb' }}
                        value={row.selling_rate || ''}
                        onChange={e => updateRow(idx, 'selling_rate', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: 2 }} onClick={() => removeRow(idx)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#16a34a' }}>
            Grand Total Amount: ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'दर पुस्तक नोंदी जतन करा' : 'Save Rate Entries')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Date Range Filter Bar & Search Input Bar */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          {/* Date Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="var(--blue-600)" />
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी / संपूर्ण महिना:' : 'Filter Month / Date Range:'}</label>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13 }}>{lang === 'mr' ? 'ते' : 'to'}</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {/* Search Input Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              style={{ width: 240, padding: '4px 10px', fontSize: 13 }}
              placeholder={lang === 'mr' ? 'नाव, स्टॉक क्र. किंवा तपशीलाने शोधा...' : 'Search by Name, Stock No, Particulars...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* History Register Table matching Grid 1 */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही नोंदी आढळल्या नाहीत.' : 'No rate book entries found for selected date range.'}
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
                {filteredHistory.map(row => (
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

      {/* Printable Register Modal for Range / Full Month */}
      {showPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 950, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Selling Rate Book Register Print ({startDate} to {endDate})</h4>
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
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {startDate} to {endDate}</div>
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
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={14} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
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
