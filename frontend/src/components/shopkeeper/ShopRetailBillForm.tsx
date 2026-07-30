import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, Search } from 'lucide-react';
import { fetchNextShopRetailBillNo, createShopRetailBill, fetchShopRetailBills, deleteShopRetailBill } from '../../api/client';
import type { ShopRetailBill, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface ShopRetailBillFormProps {
  user?: User | null;
}

interface RetailBillRow {
  id: string;
  particulars: string;
  rate: number;
  amount: number;
}

const ShopRetailBillForm: React.FC<ShopRetailBillFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [billNo, setBillNo] = useState('');
  const [tinNo, setTinNo] = useState('29540268502');
  const [customerName, setCustomerName] = useState('');
  const [sellerSig, setSellerSig] = useState('Seller Signed');

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-item addable grid rows
  const [items, setItems] = useState<RetailBillRow[]>([
    { id: '1', particulars: PESTICIDE_PRODUCT_LIST[0], rate: 0, amount: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopRetailBill[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ShopRetailBill | null>(null);

  useEffect(() => {
    loadNextBillNo(date);
  }, [date]);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  const loadNextBillNo = async (d: string) => {
    try {
      const res = await fetchNextShopRetailBillNo(d);
      setBillNo(res.bill_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchShopRetailBills(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const updateRow = (index: number, field: keyof RetailBillRow, val: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: val };
    const r = parseFloat(String(row.rate)) || 0;
    row.amount = r;
    updated[index] = row;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), particulars: PESTICIDE_PRODUCT_LIST[0], rate: 0, amount: 0 }
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((s, r) => s + (r.amount || 0), 0);

  const handleReset = () => {
    setDate(today);
    setCustomerName('');
    setItems([{ id: '1', particulars: PESTICIDE_PRODUCT_LIST[0], rate: 0, amount: 0 }]);
    setSellerSig('Seller Signed');
    setMsg(null);
    loadNextBillNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer Name.' });
      return;
    }
    if (grandTotal <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया रक्कम प्रविष्ट करा.' : 'Please enter Rate / Amount for at least one item.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      let createdLast: ShopRetailBill | null = null;
      for (const item of items) {
        if (item.amount > 0) {
          createdLast = await createShopRetailBill({
            date,
            bill_no: billNo,
            tin_no: tinNo.trim() || '29540268502',
            customer_name: customerName.trim(),
            particulars: item.particulars,
            rate: Number(item.rate) || 0,
            amount: item.amount,
            seller_signature: sellerSig,
            created_by: user?.username || 'shopkeeper',
          });
        }
      }

      setMsg({
        type: 'success',
        text: (lang === 'mr' ? `किरकोळ बिल ${billNo} जतन केले!` : `Retail Cash Bill ${billNo} saved successfully!`) +
          (lang === 'mr' ? ' (ऑटो-कीटकनाशके नोंदवहीत जोडले गेले)' : ' (Auto-posted to Pesticide Register if applicable)')
      });
      if (createdLast) setSelectedBill(createdLast);
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'बिल जतन करताना त्रुटी आली.' : 'Error saving retail bill.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे बिल हटवायचे आहे का?' : 'Are you sure you want to delete this retail bill?')) return;
    try {
      await deleteShopRetailBill(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (b: ShopRetailBill) => {
    setSelectedBill(b);
    setShowPrintModal(true);
  };

  const filteredHistory = history.filter(row =>
    row.bill_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.particulars.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            3. {lang === 'mr' ? 'किरकोळ रोख बिल (TIN / PPO INSAT / BLG/48)' : 'Retail Cash Bill (TIN / PPO INSAT / BLG/48)'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            TIN: 29540268502 | PPO / INSAT / BLG/48 Printed on form | Phone No.: 2460534
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {history.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
              <Printer size={14} /> {lang === 'mr' ? 'प्रिंट करा' : 'Print Bill'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन बिल' : 'New Bill'}
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
            <label className="form-label">{lang === 'mr' ? 'बिल क्र. / इनव्हॉईस क्र.' : 'Bill No. / Invoice No.'}</label>
            <input type="text" className="form-input" value={billNo} onChange={e => setBillNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">TIN No.</label>
            <input type="text" className="form-input" value={tinNo} onChange={e => setTinNo(e.target.value)} />
          </div>
          <div className="form-group">
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

        {/* Multi-Item Dynamic Table Grid matching Specification 3 */}
        <div style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {lang === 'mr' ? 'तपशील व दर मेमो (Particulars, Rate, Amount Grid)' : 'Particulars, Rate, Amount Grid'}
            </h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> {lang === 'mr' ? '+ बाब जोडा (Add Item)' : '+ Add Item'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ width: 40 }}>#</th>
                  <th>Particulars</th>
                  <th style={{ width: 140 }}>Rate (₹)</th>
                  <th style={{ width: 160, textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ width: 50, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <select
                        className="form-input"
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
                        step="0.01"
                        className="form-input"
                        value={row.rate || ''}
                        onChange={e => updateRow(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      ₹{row.amount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(idx)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#16a34a' }}>
            Grand Total Retail Amount: ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'रोख बिल जतन करा' : 'Save Retail Bill')}
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
              placeholder={lang === 'mr' ? 'बिल क्र. किंवा नाव शोधा...' : 'Search Bill No, Customer Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* History Register Table */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही बिल नोंदी आढळल्या नाहीत.' : 'No retail bills found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Bill / Invoice No.</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Particulars</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.bill_no}</td>
                    <td>{row.date}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.particulars}</td>
                    <td>₹{Number(row.rate).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 6 }}>
                        <Printer size={13} /> {lang === 'mr' ? 'बिल' : 'Bill'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Memo View matching Specification 3 Header */}
      {(showPrintModal || selectedBill) && selectedBill && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 650, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Retail Cash Bill Preview & Print</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedBill(null); }}>
                  Close
                </button>
              </div>
            </div>

            {/* Print Container matching Specification 3 */}
            <div className="printable-retail-bill" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: 0 }}>
                  The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, fontWeight: 'bold' }}>
                  <span>TIN: {selectedBill.tin_no || '29540268502'}</span>
                  <span>PPO / INSAT / BLG/48</span>
                  <span>Phone No.: 2460534</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                <div><strong>Bill No. / Invoice No.:</strong> {selectedBill.bill_no}</div>
                <div><strong>Date:</strong> {selectedBill.date}</div>
              </div>

              <div style={{ marginBottom: 14, fontSize: 13 }}>
                <strong>Customer Name:</strong> {selectedBill.customer_name}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left' }}>Particulars</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ minHeight: 50 }}>
                    <td style={{ border: '1px solid #000', padding: 8, fontWeight: 'bold' }}>{selectedBill.particulars}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(selectedBill.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedBill.amount).toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Total:</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontSize: 14 }}>₹{Number(selectedBill.amount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ marginTop: 40, textAlign: 'right', fontSize: 12, fontWeight: 'bold' }}>
                Seller's Signature: __________________
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopRetailBillForm;
