import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, Receipt, X, Languages } from 'lucide-react';
import { createShopTaxInvoice, updateShopTaxInvoice, fetchShopTaxInvoices, deleteShopTaxInvoice } from '../../api/client';
import type { ShopTaxInvoice, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi, getMarathiItem } from '../../utils/translator';
import { getStoredProducts, addStoredProduct } from '../../utils/productStore';


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
  sgst_rate: number;
  sgst_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  total_amount: number;
}

const ShopTaxInvoiceForm: React.FC<ShopTaxInvoiceFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [editingId, setEditingId] = useState<number | null>(null);

  const [date, setDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamically manageable products list
  const [productList, setProductList] = useState<string[]>(getStoredProducts());

  const handleAddNewProduct = (index: number) => {
    const newProd = window.prompt(
      lang === 'mr'
        ? 'नवीन उत्पादनाचे नाव प्रविष्ट करा (उदा. Tata Fungicide, Urea 50kg):'
        : 'Enter new product name (e.g. Tata Fungicide, Urea 50kg):'
    );
    if (newProd && newProd.trim()) {
      const updatedList = addStoredProduct(newProd.trim());
      setProductList(updatedList);
      updateRow(index, 'product_name', newProd.trim());
    }
  };

  // Multi-item addable grid rows
  const [items, setItems] = useState<TaxInvoiceRow[]>([
    {
      id: '1',
      product_name: PESTICIDE_PRODUCT_LIST[0],
      hsn_code: '3808',
      qty: 1,
      rate: 0,
      amount: 0,
      sgst_rate: 9,
      sgst_amount: 0,
      cgst_rate: 9,
      cgst_amount: 0,
      total_amount: 0,
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopTaxInvoice[]>([]);

  // Print Modals
  const [showRangePrintModal, setShowRangePrintModal] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<ShopTaxInvoice | null>(null);

  useEffect(() => {
    loadHistory();
    setInvoiceNo(`STX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, [startDate, endDate]);

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

    const q = parseFloat(String(row.qty)) || 1;
    const r = parseFloat(String(row.rate)) || 0;
    const baseAmt = q * r;
    row.amount = baseAmt;

    const sRate = parseFloat(String(row.sgst_rate)) || 0;
    const cRate = parseFloat(String(row.cgst_rate)) || 0;

    const sAmt = (baseAmt * sRate) / 100;
    const cAmt = (baseAmt * cRate) / 100;

    row.sgst_amount = sAmt;
    row.cgst_amount = cAmt;
    row.total_amount = baseAmt + sAmt + cAmt;

    updated[index] = row;
    setItems(updated);
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        product_name: PESTICIDE_PRODUCT_LIST[0],
        hsn_code: '3808',
        qty: 1,
        rate: 0,
        amount: 0,
        sgst_rate: 9,
        sgst_amount: 0,
        cgst_rate: 9,
        cgst_amount: 0,
        total_amount: 0,
      }
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((s, r) => s + (r.total_amount || 0), 0);

  const handleReset = () => {
    setEditingId(null);
    setDate(today);
    setInvoiceNo(`STX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomerName('');
    setItems([
      {
        id: '1',
        product_name: PESTICIDE_PRODUCT_LIST[0],
        hsn_code: '3808',
        qty: 1,
        rate: 0,
        amount: 0,
        sgst_rate: 9,
        sgst_amount: 0,
        cgst_rate: 9,
        cgst_amount: 0,
        total_amount: 0,
      }
    ]);
    setMsg(null);
  };

  const handleEdit = (inv: ShopTaxInvoice) => {
    setEditingId(inv.id);
    setDate(inv.date);
    setInvoiceNo(inv.invoice_no);
    setCustomerName(inv.customer_name);
    setItems([
      {
        id: inv.id.toString(),
        product_name: inv.product_name,
        hsn_code: inv.hsn_code || '3808',
        qty: inv.qty,
        rate: inv.rate,
        amount: inv.amount,
        sgst_rate: inv.sgst_rate ?? 9,
        sgst_amount: inv.sgst_amount ?? 0,
        cgst_rate: inv.cgst_rate ?? 9,
        cgst_amount: inv.cgst_amount ?? 0,
        total_amount: inv.total_amount ?? inv.amount,
      }
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTranslateAllFields = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया ग्राहकाचे नाव प्रविष्ट करा.' : 'Please enter Customer Name.' });
      return;
    }
    if (grandTotal <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया प्रमाण व दर प्रविष्ट करा.' : 'Please enter valid Qty and Rate for items.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      if (editingId) {
        const item = items[0];
        await updateShopTaxInvoice(editingId, {
          date,
          invoice_no: invoiceNo,
          customer_name: customerName.trim(),
          product_name: item.product_name,
          hsn_code: item.hsn_code,
          qty: Number(item.qty) || 1,
          rate: Number(item.rate) || 0,
          amount: item.amount,
          sgst_rate: Number(item.sgst_rate) || 0,
          sgst_amount: item.sgst_amount,
          cgst_rate: Number(item.cgst_rate) || 0,
          cgst_amount: item.cgst_amount,
          total_amount: item.total_amount,
          created_by: user?.username || 'shopkeeper',
        });
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'टॅक्स इनव्हॉईस अपडेट केले!' : 'Shop Tax Invoice updated successfully!'
        });
      } else {
        for (const item of items) {
          if (item.total_amount > 0) {
            await createShopTaxInvoice({
              date,
              invoice_no: invoiceNo,
              customer_name: customerName.trim(),
              product_name: item.product_name,
              hsn_code: item.hsn_code,
              qty: Number(item.qty) || 1,
              rate: Number(item.rate) || 0,
              amount: item.amount,
              sgst_rate: Number(item.sgst_rate) || 0,
              sgst_amount: item.sgst_amount,
              cgst_rate: Number(item.cgst_rate) || 0,
              cgst_amount: item.cgst_amount,
              total_amount: item.total_amount,
              created_by: user?.username || 'shopkeeper',
            });
          }
        }
        setMsg({
          type: 'success',
          text: (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन केले!' : 'Shop Tax Invoice saved successfully!') +
            (lang === 'mr' ? ' (ऑटो-कीटकनाशके नोंदवहीत जोडली गेली)' : ' (Auto-posted to Pesticide Register if applicable)')
        });
      }

      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करताना त्रुटी आली.' : 'Error saving shop tax invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हा इनव्हॉईस हटवायचा आहे का?' : 'Are you sure you want to delete this tax invoice?')) return;
    try {
      await deleteShopTaxInvoice(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const filteredHistory = history.filter(row =>
    row.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #2563eb', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dbeafe', padding: 10, borderRadius: 8, color: '#1e40af' }}>
            <Receipt size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              2. {lang === 'mr' ? 'दुकान टॅक्स इनव्हॉईस (Tax Invoice)' : 'Shop Tax Invoice'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRangePrintModal(true)} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
            <Printer size={14} /> {lang === 'mr' ? 'महिना / कालावधी रजिस्टर प्रिंट करा' : 'Print Month / Range Register'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
          </button>
        </div>
      </div>

      {/* Official Header Sub-banner matching exact phone specs */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1e40af' }}>
            {lang === 'mr' ? 'द बेळगाव गार्डनर्स को-ऑप. प्रॉडक्शन सप्लाय अँड सेल सोसायटी लि., बेळगाव' : 'The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>930/1A Zanda Chowk Market, Belagavi – 590002</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#1e3a8a', lineHeight: '1.5' }}>
          <div><strong>H.O. Phone:</strong> 2460534</div>
          <div><strong>Cold Storage Phone:</strong> 2478234</div>
          <div><strong>PPO / INSAT Phone:</strong> 2461468</div>
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
            ✏️ Edit Mode: Updating Tax Invoice #{editingId} ({invoiceNo})
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <X size={14} /> Cancel Edit
          </button>
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No)' : 'Invoice No.'}</label>
            <input type="text" className="form-input" style={{ fontWeight: 700, color: '#2563eb' }} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">{lang === 'mr' ? 'ग्राहक नाव (Customer Name)' : 'Customer Name'}</label>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#1e40af', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                onClick={async () => customerName && setCustomerName(await translateToMarathi(customerName))}
                title="Translate Customer Name to Marathi"
              >
                <Languages size={12} /> {lang === 'mr' ? 'मराठीत करा' : 'Translate to Marathi'}
              </button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'mr' ? 'ग्राहकाचे नाव प्रविष्ट करा' : 'Customer name'}
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dynamic Multi-Item Table Grid */}
        <div style={{ background: '#eff6ff', padding: 18, borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1e40af' }}>
              {lang === 'mr' ? 'इनव्हॉईस वस्तू व जीएसटी तक्ता (Tax Invoice Grid Items)' : 'Tax Invoice Grid Items'}
            </h4>
            {!editingId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ background: '#fff' }}>
                <Plus size={14} /> {lang === 'mr' ? '+ बाब जोडा (Add Item)' : '+ Add Item'}
              </button>
            )}
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 950, fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}>
                  <th style={{ width: 35, padding: '8px 6px' }}>#</th>
                  <th style={{ minWidth: 200, padding: '8px 6px' }}>{lang === 'mr' ? 'उत्पादनाचे नाव (Product Name)' : 'Product Name'}</th>
                  <th style={{ width: 90, padding: '8px 6px' }}>{lang === 'mr' ? 'एचएसएन' : 'HSN Code'}</th>
                  <th style={{ width: 75, padding: '8px 6px' }}>{lang === 'mr' ? 'प्रमाण (Qty)' : 'Qty'}</th>
                  <th style={{ width: 95, padding: '8px 6px' }}>{lang === 'mr' ? 'दर (Rate)' : 'Rate (₹)'}</th>
                  <th style={{ width: 100, padding: '8px 6px' }}>{lang === 'mr' ? 'मूळ रक्कम' : 'Base Amt (₹)'}</th>
                  <th style={{ width: 85, padding: '8px 6px' }}>{lang === 'mr' ? 'एसजीएसटी %' : 'SGST %'}</th>
                  <th style={{ width: 85, padding: '8px 6px' }}>{lang === 'mr' ? 'सीजीएसटी %' : 'CGST %'}</th>
                  <th style={{ width: 120, padding: '8px 6px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total (₹)'}</th>
                  <th style={{ width: 40, padding: '8px 6px', textAlign: 'center' }}></th>
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
                        onChange={e => {
                          if (e.target.value === '__ADD_NEW__') {
                            handleAddNewProduct(idx);
                          } else {
                            updateRow(idx, 'product_name', e.target.value);
                          }
                        }}
                      >
                        {productList.map(p => (
                          <option key={p} value={p}>
                            {lang === 'mr' ? getMarathiItem(p) : p}
                          </option>
                        ))}
                        <option value="__ADD_NEW__" style={{ fontWeight: 'bold', color: '#2563eb' }}>
                          {lang === 'mr' ? '➕ + नवीन उत्पादन जोडा (Add New Product)' : '➕ + Add New Product...'}
                        </option>
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
                    <td style={{ padding: '6px 4px', fontWeight: 600 }}>
                      ₹{row.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <select
                        className="form-input"
                        style={{ fontSize: 12, padding: '6px 4px' }}
                        value={row.sgst_rate}
                        onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                      >
                        <option value="0">0%</option>
                        <option value="2.5">2.5%</option>
                        <option value="6">6%</option>
                        <option value="9">9%</option>
                        <option value="14">14%</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <select
                        className="form-input"
                        style={{ fontSize: 12, padding: '6px 4px' }}
                        value={row.cgst_rate}
                        onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                      >
                        <option value="0">0%</option>
                        <option value="2.5">2.5%</option>
                        <option value="6">6%</option>
                        <option value="9">9%</option>
                        <option value="14">14%</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 14 }}>
                      ₹{row.total_amount.toFixed(2)}
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
            {lang === 'mr' ? 'एकूण इनव्हॉईस रक्कम:' : 'Grand Total Invoice Amount:'} ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Invoice') : (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करा' : 'Save Tax Invoice'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleTranslateAllFields}
          >
            <Languages size={16} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
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
              placeholder={lang === 'mr' ? 'इनव्हॉईस क्र. किंवा नाव शोधा...' : 'Search Invoice No, Customer Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* History Register Table with Marathi Header Translation */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणतेही टॅक्स इनव्हॉईस आढळले नाहीत.' : 'No shop tax invoices found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#eff6ff' }}>
                  <th>{lang === 'mr' ? 'इनव्हॉईस क्र.' : 'Invoice No.'}</th>
                  <th>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th>{lang === 'mr' ? 'ग्राहकाचे नाव' : 'Customer Name'}</th>
                  <th>{lang === 'mr' ? 'उत्पादनाचे नाव' : 'Product Name'}</th>
                  <th>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th>{lang === 'mr' ? 'दर' : 'Rate'}</th>
                  <th>{lang === 'mr' ? 'एसजीएसटी' : 'SGST (9%)'}</th>
                  <th>{lang === 'mr' ? 'सीजीएसटी' : 'CGST (9%)'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण (₹)' : 'Total (₹)'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                    <td>{row.date}</td>
                    <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                    <td>{lang === 'mr' ? getMarathiItem(row.product_name) : row.product_name}</td>
                    <td>{row.qty}</td>
                    <td>₹{Number(row.rate).toFixed(2)}</td>
                    <td>₹{Number(row.sgst_amount).toFixed(2)}</td>
                    <td>₹{Number(row.cgst_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedInvoiceForPrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#2563eb', borderColor: '#2563eb' }} title="Print Invoice">
                        <Printer size={13} />
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
      {selectedInvoiceForPrint && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 750, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Tax Invoice Print #{selectedInvoiceForPrint.invoice_no}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={14} /> Print Invoice
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInvoiceForPrint(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-tax-invoice" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.
                </h3>
                <div style={{ fontSize: 12, marginTop: 4 }}>930/1A Zanda Chowk Market, Belagavi – 590002</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, fontWeight: 'bold' }}>
                  <span>H.O. Phone: 2460534</span>
                  <span>Cold Storage Phone: 2478234</span>
                  <span>PPO / INSAT Phone: 2461468</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10, textDecoration: 'underline' }}>
                  TAX INVOICE
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16, borderBottom: '1px solid #000', paddingBottom: 8 }}>
                <div>
                  <div><strong>Invoice No:</strong> {selectedInvoiceForPrint.invoice_no}</div>
                  <div><strong>Customer Name:</strong> {selectedInvoiceForPrint.customer_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Date:</strong> {selectedInvoiceForPrint.date}</div>
                  <div><strong>HSN Code:</strong> {selectedInvoiceForPrint.hsn_code || '3808'}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Product Details</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Base Amt (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>SGST ({selectedInvoiceForPrint.sgst_rate}%)</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>CGST ({selectedInvoiceForPrint.cgst_rate}%)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>{selectedInvoiceForPrint.product_name}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{selectedInvoiceForPrint.qty}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(selectedInvoiceForPrint.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(selectedInvoiceForPrint.amount).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(selectedInvoiceForPrint.sgst_amount).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(selectedInvoiceForPrint.cgst_amount).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedInvoiceForPrint.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Customer Signature<br /><br />_______________</div>
                <div>Authorized Signatory<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Register View for Date Range */}
      {showRangePrintModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '95%', maxWidth: 900, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Shop Tax Invoices Register Print ({startDate} to {endDate})</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={14} /> Print Register
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRangePrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-tax-register" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.
                </h3>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  SHOP TAX INVOICES REGISTER
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {startDate} to {endDate}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Inv No.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Customer Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Product Details</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>SGST</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>CGST</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.invoice_no}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.customer_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.product_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.qty}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.sgst_amount).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.cgst_amount).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(row.total_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Shop Keeper Signature<br /><br />_______________</div>
                <div>Accountant Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopTaxInvoiceForm;
