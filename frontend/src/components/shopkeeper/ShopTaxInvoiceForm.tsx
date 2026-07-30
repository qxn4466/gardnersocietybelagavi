import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, Receipt, X } from 'lucide-react';
import { fetchNextShopTaxInvoiceNo, createShopTaxInvoice, updateShopTaxInvoice, fetchShopTaxInvoices, deleteShopTaxInvoice } from '../../api/client';
import type { ShopTaxInvoice, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi } from '../../utils/translator';


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

  const [editingId, setEditingId] = useState<number | null>(null);

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
  const [showRegisterPrintModal, setShowRegisterPrintModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ShopTaxInvoice | null>(null);

  useEffect(() => {
    if (!editingId) {
      loadNextInvoiceNo(date);
    }
  }, [date, editingId]);

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
    setEditingId(null);
    setDate(today);
    setCustomerName('');
    setCustomerPhone('');
    setItems([{ id: '1', product_name: PESTICIDE_PRODUCT_LIST[0], hsn_code: '3808', qty: 1, rate: 0, amount: 0 }]);
    setMsg(null);
    loadNextInvoiceNo(today);
  };

  const handleEdit = (inv: ShopTaxInvoice) => {
    setEditingId(inv.id);
    setInvoiceNo(inv.invoice_no);
    setDate(inv.date);
    setCustomerName(inv.customer_name);
    setCustomerPhone(inv.customer_phone || '');
    setItems([
      {
        id: inv.id.toString(),
        product_name: inv.product_name,
        hsn_code: inv.hsn_code || '3808',
        qty: inv.qty,
        rate: inv.rate,
        amount: inv.amount,
      }
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (editingId) {
        const item = items[0];
        const updated = await updateShopTaxInvoice(editingId, {
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
        setMsg({
          type: 'success',
          text: lang === 'mr' ? `टॅक्स इनव्हॉईस ${invoiceNo} अपडेट केले!` : `Shop Tax Invoice ${invoiceNo} updated successfully!`
        });
        setSelectedInvoice(updated);
        setShowPrintModal(true);
      } else {
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
        if (createdLast) {
          setSelectedInvoice(createdLast);
          setShowPrintModal(true);
        }
      }

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

  const handleSingleInvoicePrint = (inv: ShopTaxInvoice) => {
    setSelectedInvoice(inv);
    setShowPrintModal(true);
  };

  const filteredHistory = history.filter(row =>
    row.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #2563eb', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dbeafe', padding: 10, borderRadius: 8, color: '#1d4ed8' }}>
            <Receipt size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              2. {lang === 'mr' ? 'दुकान टॅक्स इनव्हॉईस (TAX INVOICE)' : 'TAX INVOICE'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              H.O. Phone: 2460534 | Cold Storage Phone: 2478234 | PPO / INSAT Phone: 2461468
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRegisterPrintModal(true)} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
            <Printer size={14} /> {lang === 'mr' ? 'महिना / कालावधी इनव्हॉईस प्रिंट करा' : 'Print Month / Range Invoices'}
          </button>
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

      {editingId && (
        <div style={{ background: '#fef3c7', padding: '10px 16px', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            ✏️ Edit Mode: Updating Tax Invoice #{invoiceNo}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <X size={14} /> Cancel Edit
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
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

        {/* Multi-Item Dynamic Table Grid */}
        <div style={{ background: '#eff6ff', padding: 18, borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1e40af' }}>
              {lang === 'mr' ? 'उत्पादने तक्ता (Product, HSN Code, Qty, Rate, Amount Grid)' : 'Product, HSN Code, Qty, Rate, Amount Grid'}
            </h4>
            {!editingId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ background: '#fff' }}>
                <Plus size={14} /> {lang === 'mr' ? '+ उत्पादने जोडा (Add Item)' : '+ Add Item'}
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}>
                  <th style={{ width: 40, padding: '8px 6px' }}>#</th>
                  <th style={{ padding: '8px 6px' }}>Product Name</th>
                  <th style={{ width: 140, padding: '8px 6px' }}>HSN Code</th>
                  <th style={{ width: 100, padding: '8px 6px' }}>Qty</th>
                  <th style={{ width: 130, padding: '8px 6px' }}>Rate (₹)</th>
                  <th style={{ width: 150, padding: '8px 6px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ width: 50, padding: '8px 6px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id} style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 4px', textIndent: 4 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <select
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.product_name}
                        onChange={e => updateRow(idx, 'product_name', e.target.value)}
                      >
                        {PESTICIDE_PRODUCT_LIST.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.hsn_code}
                        onChange={e => updateRow(idx, 'hsn_code', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.rate || ''}
                        onChange={e => updateRow(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#1e40af', fontSize: 14 }}>
                      ₹{row.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      {items.length > 1 && !editingId && (
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: 4 }} onClick={() => removeRow(idx)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#1e40af' }}>
            Grand Total Invoice Amount: ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Invoice') : (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करा' : 'Save Tax Invoice'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600 }}
            onClick={async () => {
              if (customerName) {
                const translatedName = await translateToMarathi(customerName);
                setCustomerName(translatedName);
              }
              const updatedItems = await Promise.all(
                items.map(async item => ({
                  ...item,
                  product_name: await translateToMarathi(item.product_name),
                }))
              );
              setItems(updatedItems);
            }}
          >
            🌐 {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Date Range Filter Bar & Search Input Bar */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#2563eb" />
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी / संपूर्ण महिना:' : 'Filter Month / Date Range:'}</label>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13 }}>{lang === 'mr' ? 'ते' : 'to'}</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

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

        {/* History Register Table with Edit & Print */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही इनव्हॉईस नोंदी आढळल्या नाहीत.' : 'No shop tax invoices found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#eff6ff' }}>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Product</th>
                  <th>HSN Code</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
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
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{Number(row.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSingleInvoicePrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#2563eb', borderColor: '#2563eb' }} title="Print Invoice">
                        <Printer size={13} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, padding: '4px 6px' }} title="Edit Invoice">
                        <Edit size={13} color="#2563eb" />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} style={{ padding: '4px 6px' }}>
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

      {/* Single Invoice Print Modal */}
      {showPrintModal && selectedInvoice && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 750, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>TAX INVOICE Preview & Print ({selectedInvoice.invoice_no})</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={14} /> Print Now
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

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

      {/* Range Register Print Modal */}
      {showRegisterPrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 900, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>TAX INVOICE REGISTER ({startDate} to {endDate})</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={14} /> Print Register
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRegisterPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-tax-register" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  THE BELGAUM GARDENERS CO-OP PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM
                </h3>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  SHOP TAX INVOICES REGISTER (GST 3808)
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {startDate} to {endDate}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Invoice No</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Customer Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Product Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>HSN</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12 }}>No invoices found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>{row.invoice_no}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.customer_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.product_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.hsn_code || '3808'}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.qty}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Shop Keeper Signature<br /><br />_______________</div>
                <div>Manager Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopTaxInvoiceForm;
