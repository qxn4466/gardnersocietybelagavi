import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, CheckCircle2, AlertCircle, Calendar, Search } from 'lucide-react';
import { fetchNextShopTaxInvoiceNo, createShopTaxInvoice, fetchShopTaxInvoices, deleteShopTaxInvoice } from '../../api/client';
import type { ShopTaxInvoice, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface ShopTaxInvoiceFormProps {
  user?: User | null;
}

interface TaxInvoiceRow {
  id: string;
  product_name: string;
  hsn_code: string;
  qty: number;
  rate: number;
  amount: number;
}

const ShopTaxInvoiceForm: React.FC<ShopTaxInvoiceFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-item addable grid rows
  const [items, setItems] = useState<TaxInvoiceRow[]>([
    { id: '1', product_name: PESTICIDE_PRODUCT_LIST[0], hsn_code: '3808', qty: 1, rate: 0, amount: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopTaxInvoice[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ShopTaxInvoice | null>(null);

  useEffect(() => {
    loadNextInvoiceNo(date);
  }, [date]);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  const loadNextInvoiceNo = async (d: string) => {
    try {
      const res = await fetchNextShopTaxInvoiceNo(d);
      setInvoiceNo(res.invoice_no);
    } catch {
      // ignore
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchShopTaxInvoices(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const updateRow = (index: number, field: keyof TaxInvoiceRow, val: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: val };
    const q = parseFloat(String(row.qty)) || 0;
    const r = parseFloat(String(row.rate)) || 0;
    row.amount = q * r;
    updated[index] = row;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), product_name: PESTICIDE_PRODUCT_LIST[0], hsn_code: '3808', qty: 1, rate: 0, amount: 0 }
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
    setCustomerPhone('');
    setItems([{ id: '1', product_name: PESTICIDE_PRODUCT_LIST[0], hsn_code: '3808', qty: 1, rate: 0, amount: 0 }]);
    setMsg(null);
    loadNextInvoiceNo(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer Name.' });
      return;
    }
    if (grandTotal <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया दर व प्रमाण योग्य प्रविष्ट करा.' : 'Please enter valid Qty and Rate for at least one item.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      let createdLast: ShopTaxInvoice | null = null;
      for (const item of items) {
        if (item.amount > 0) {
          createdLast = await createShopTaxInvoice({
            date,
            invoice_no: invoiceNo,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || undefined,
            product_name: item.product_name,
            hsn_code: item.hsn_code || '3808',
            qty: Number(item.qty) || 1,
            rate: Number(item.rate) || 0,
            amount: item.amount,
            created_by: user?.username || 'shopkeeper',
          });
        }
      }

      setMsg({
        type: 'success',
        text: (lang === 'mr' ? `टॅक्स इनव्हॉईस ${invoiceNo} जतन केले!` : `Shop Tax Invoice ${invoiceNo} saved successfully!`) +
          (lang === 'mr' ? ' (ऑटो-कीटकनाशके नोंदवहीत जोडले गेले)' : ' (Auto-posted to Pesticide Register if applicable)')
      });
      if (createdLast) setSelectedInvoice(createdLast);
      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'इनव्हॉईस जतन करताना त्रुटी आली.' : 'Error saving tax invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे इनव्हॉईस हटवायचे आहे का?' : 'Are you sure you want to delete this invoice?')) return;
    try {
      await deleteShopTaxInvoice(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const handlePrint = (inv: ShopTaxInvoice) => {
    setSelectedInvoice(inv);
    setShowPrintModal(true);
  };

  const filteredHistory = history.filter(row =>
    row.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            2. {lang === 'mr' ? 'दुकान टॅक्स इनव्हॉईस (TAX INVOICE)' : 'TAX INVOICE'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            H.O. Phone: 2460534 | Cold Storage Phone: 2478234 | PPO / INSAT Phone: 2461468
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {history.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => handlePrint(history[0])}>
              <Printer size={14} /> {lang === 'mr' ? 'प्रिंट करा' : 'Print Invoice'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन इनव्हॉईस' : 'New Invoice'}
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
            <label className="form-label">{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No.)' : 'Invoice No.'}</label>
            <input type="text" className="form-input" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
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
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'फोन क्र.' : 'Customer Phone'}</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 9845012345"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Multi-Item Dynamic Table Grid matching Specification 2 */}
        <div style={{ background: 'var(--surface-subtle)', padding: 18, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {lang === 'mr' ? 'उत्पादने तक्ता (Product, HSN Code, Qty, Rate, Amount Grid)' : 'Product, HSN Code, Qty, Rate, Amount Grid'}
            </h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> {lang === 'mr' ? '+ उत्पादने जोडा (Add Item)' : '+ Add Item'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ width: 40 }}>#</th>
                  <th>Product Name</th>
                  <th style={{ width: 120 }}>HSN Code</th>
                  <th style={{ width: 90 }}>Qty</th>
                  <th style={{ width: 120 }}>Rate (₹)</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Amount (₹)</th>
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
                        value={row.product_name}
                        onChange={e => updateRow(idx, 'product_name', e.target.value)}
                      >
                        {PESTICIDE_PRODUCT_LIST.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        value={row.hsn_code}
                        onChange={e => updateRow(idx, 'hsn_code', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                      />
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
            Grand Total Invoice Amount: ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करा' : 'Save Tax Invoice')}
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
              placeholder={lang === 'mr' ? 'इनव्हॉईस क्र. किंवा नाव शोधा...' : 'Search Invoice No, Name, Product...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* History Register Table */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही इनव्हॉईस नोंदी आढळल्या नाहीत.' : 'No shop tax invoices found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Product</th>
                  <th>HSN Code</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                    <td>{row.date}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.product_name}</td>
                    <td>{row.hsn_code || '3808'}</td>
                    <td>{row.qty}</td>
                    <td>₹{Number(row.rate).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{Number(row.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(row)} style={{ marginRight: 6 }}>
                        <Printer size={13} /> {lang === 'mr' ? 'इनव्हॉईस' : 'Invoice'}
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

      {/* Printable Invoice Modal matching Specification 2 Header */}
      {(showPrintModal || selectedInvoice) && selectedInvoice && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 750, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>TAX INVOICE Preview & Print</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowPrintModal(false); setSelectedInvoice(null); }}>
                  Close
                </button>
              </div>
            </div>

            {/* Print Container matching Specification 2 */}
            <div className="printable-tax-invoice" style={{ border: '2px solid #000', padding: 24, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
              <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ width: '65%' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: 0 }}>
                      The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.
                    </h3>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      930/1A Zanda Chowk Market, Belagavi – 590002
                    </div>
                  </div>
                  <div style={{ width: '35%', textAlign: 'right', fontSize: 11 }}>
                    <div><strong>H.O. Phone:</strong> 2460534</div>
                    <div><strong>Cold Storage Phone:</strong> 2478234</div>
                    <div><strong>PPO / INSAT Phone:</strong> 2461468</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginTop: 10, letterSpacing: '0.05em' }}>
                  TAX INVOICE
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                <div><strong>Invoice No:</strong> {selectedInvoice.invoice_no}</div>
                <div><strong>Date:</strong> {selectedInvoice.date}</div>
              </div>

              <div style={{ marginBottom: 14, fontSize: 13 }}>
                <strong>Customer Name:</strong> {selectedInvoice.customer_name} {selectedInvoice.customer_phone ? `(Ph: ${selectedInvoice.customer_phone})` : ''}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left' }}>Product</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>HSN Code</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ minHeight: 60 }}>
                    <td style={{ border: '1px solid #000', padding: 8, fontWeight: 'bold' }}>{selectedInvoice.product_name}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{selectedInvoice.hsn_code || '3808'}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{selectedInvoice.qty}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(selectedInvoice.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedInvoice.amount).toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={4} style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Total Invoice Amount:</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontSize: 14 }}>₹{Number(selectedInvoice.amount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Customer Signature<br /><br />_______________</div>
                <div>Seller / Shop Keeper Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopTaxInvoiceForm;
