import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, Receipt, X, Languages, Check, FolderPlus, Zap, Loader2, Table, List } from 'lucide-react';
import { createShopTaxInvoice, updateShopTaxInvoice, fetchShopTaxInvoices, deleteShopTaxInvoice, generate30DaysTestData } from '../../api/client';


import type { ShopTaxInvoice, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi, getMarathiItem } from '../../utils/translator';
import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';
import SearchableCombobox from '../SearchableCombobox';

interface ShopTaxInvoiceFormProps {
  user?: User | null;
}

interface TaxInvoiceRow {
  id: string;
  product_name: string;
  isCustomText?: boolean;
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
  const [docPath, setDocPath] = useState('');

  const [viewMode, setViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_shop_tax_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleViewModeChange = (mode: 'excel' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('bgs_shop_tax_view_mode', mode);
  };

  // Search & Filter states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const safeNum = (val: any): number => {
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  };

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
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<ShopTaxInvoice[]>([]);

  // Print Modals
  const [showRangePrintModal, setShowRangePrintModal] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<ShopTaxInvoice | null>(null);

  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');
  const loadedEditRef = useRef<string | null>(null);

  useEffect(() => {
    loadHistory();
    setInvoiceNo(`STX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, [startDate, endDate, editParam]);

  useEffect(() => {
    if (editParam && history.length > 0 && loadedEditRef.current !== editParam) {
      const numericId = parseInt(editParam);
      const match = history.find(h =>
        h.id === numericId ||
        h.invoice_no === editParam ||
        (h.invoice_no && editParam.includes(h.invoice_no)) ||
        (h.invoice_no && h.invoice_no.includes(editParam))
      );
      if (match) {
        loadedEditRef.current = editParam;
        handleEdit(match);
      }
    }
  }, [editParam, history]);

  const loadHistory = async () => {
    try {
      const data = editParam
        ? await fetchShopTaxInvoices()
        : await fetchShopTaxInvoices(startDate, endDate);
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
    const baseAmt = safeNum(inv.amount);
    const sgstPct = safeNum(inv.sgst_rate) || 9;
    const sgstAmt = safeNum(inv.sgst_amount) || ((baseAmt * sgstPct) / 100);
    const cgstPct = safeNum(inv.cgst_rate) || 9;
    const cgstAmt = safeNum(inv.cgst_amount) || ((baseAmt * cgstPct) / 100);
    const totAmt = safeNum(inv.total_amount) || (baseAmt + sgstAmt + cgstAmt);

    setItems([
      {
        id: inv.id.toString(),
        product_name: inv.product_name || PESTICIDE_PRODUCT_LIST[0],
        hsn_code: inv.hsn_code || '3808',
        qty: safeNum(inv.qty) || 1,
        rate: safeNum(inv.rate),
        amount: baseAmt,
        sgst_rate: sgstPct,
        sgst_amount: sgstAmt,
        cgst_rate: cgstPct,
        cgst_amount: cgstAmt,
        total_amount: totAmt,
      }
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [translating, setTranslating] = useState(false);

  const handleTranslateAllFields = async () => {
    setTranslating(true);
    setMsg({
      type: 'info',
      text: lang === 'mr'
        ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...'
        : '⏳ Translating text to Marathi, please wait...'
    });
    try {
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
      setMsg({
        type: 'success',
        text: lang === 'mr' ? 'मराठीत भाषांतर यशस्वीरित्या पूर्ण झाले!' : 'Successfully translated to Marathi!'
      });
    } catch {
      setMsg({
        type: 'error',
        text: lang === 'mr' ? 'भाषांतर करताना अडचण आली.' : 'Translation failed.'
      });
    } finally {
      setTranslating(false);
    }
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
          if (item.total_amount > 0 || item.amount > 0) {
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
            recordSale(item.product_name, Number(item.qty) || 1, Number(item.rate) || 0, date);
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
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #4f46e5', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#e0e7ff', padding: 10, borderRadius: 8, color: '#4f46e5' }}>
            <Receipt size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              3. {lang === 'mr' ? 'दुकानाचे टॅक्स इनव्हॉईस बिल (Shop Tax Invoice)' : 'Shop Tax Invoice'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'टॅक्स इनव्हॉईस नोंद · कीटकनाशके नोंदवहीत स्वयंचलित नोंद' : 'Tax Invoice Entry · Auto-posts to Pesticide Register & GL'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Mode Toggle: Excel Grid vs Vertical Stack */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
          }}>
            <button
              type="button"
              onClick={() => handleViewModeChange('excel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'excel' ? '#4f46e5' : 'transparent',
                color: viewMode === 'excel' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
              id="tax-excel-view-btn"
            >
              <Table size={14} /> {lang === 'mr' ? 'एक्सेल ग्रिड' : 'Excel Grid'}
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('vertical')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'vertical' ? '#2563eb' : 'transparent',
                color: viewMode === 'vertical' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
              id="tax-vertical-view-btn"
            >
              <List size={14} /> {lang === 'mr' ? 'उभी मांडणी' : 'Vertical Stack'}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              if (!window.confirm(lang === 'mr' ? 'मागील ३० दिवसांचा चाचणी डेटा तयार करायचा आहे का?' : 'Generate 30 days test data across all shop forms?')) return;
              setLoading(true);
              try {
                const res = await generate30DaysTestData();
                setMsg({
                  type: 'success',
                  text: (lang === 'mr' ? '३० दिवसांचा चाचणी डेटा यशस्वीरित्या जोडला गेला! ' : 'Successfully added 30 days test data! ') + res.message
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
          <div style={{ color: 'var(--text-secondary)' }}>930/1A Zanda Chowk Market, Belgaum – 590002</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#1e3a8a', lineHeight: '1.5' }}>
          <div><strong>H.O. Phone:</strong> 2460534</div>
          <div><strong>Cold Storage Phone:</strong> 2478234</div>
          <div><strong>PPO / INSAT Phone:</strong> 2461468</div>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODE 1: EXCEL SPREADSHEET GRID VIEW (Vertically Aligned)       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {viewMode === 'excel' && (
          <div className="excel-form-container" style={{ marginBottom: 20, width: '100%' }}>
            <div className="excel-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Table size={16} color="#4f46e5" />
                <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                  {lang === 'mr' ? 'दुकानाचे टॅक्स इनव्हॉईस नोंद (एक्सेल ग्रिड)' : 'SHOP_TAX_INVOICE_SHEET (Excel Grid)'}
                </span>
                <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
                  {items.length} {lang === 'mr' ? 'वस्तू नोंदी' : 'Items'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {lang === 'mr' ? 'सर्व रकाने एकाखाली एक ओळीत मांडलेले आहेत' : 'All fields aligned vertically row-by-row'}
              </div>
            </div>

            <div className="excel-form-table-wrapper">
              <table className="excel-form-table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: 250 }}>{lang === 'mr' ? 'तपशील / रकाना' : 'Field / Description'}</th>
                    <th>{lang === 'mr' ? 'माहिती नोंद / मूल्य' : 'Data Entry / Input Value'}</th>
                    <th style={{ width: 280 }}>{lang === 'mr' ? 'पडताळणी आणि साधने' : 'Validation & Info'}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Invoice No */}
                  <tr>
                    <td className="excel-row-idx">1</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No)' : 'Invoice No.'}</span>
                      <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                    </td>
                    <td className="excel-col-input">
                      <input
                        type="text"
                        className="form-input"
                        style={{ maxWidth: 280, height: 38, fontWeight: 700, color: '#4f46e5' }}
                        value={invoiceNo}
                        onChange={e => setInvoiceNo(e.target.value)}
                        required
                      />
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{invoiceNo}</span>
                    </td>
                  </tr>

                  {/* Row 2: Date */}
                  <tr>
                    <td className="excel-row-idx">2</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</span>
                      <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                    </td>
                    <td className="excel-col-input">
                      <input
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                        style={{ maxWidth: 260, height: 38 }}
                      />
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{date}</span>
                    </td>
                  </tr>

                  {/* Row 3: Customer Name */}
                  <tr>
                    <td className="excel-row-idx">3</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'ग्राहक नाव (Customer Name)' : 'Customer Name'}</span>
                      <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                    </td>
                    <td className="excel-col-input">
                      <input
                        type="text"
                        className="form-input"
                        placeholder={lang === 'mr' ? 'ग्राहकाचे नाव प्रविष्ट करा' : 'Customer name'}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                        style={{ maxWidth: 420, height: 38 }}
                      />
                    </td>
                    <td className="excel-col-tools">
                      <button
                        type="button"
                        onClick={handleTranslateAllFields}
                        disabled={translating}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                        {lang === 'mr' ? 'मराठीत भाषांतर करा' : 'Translate to Marathi'}
                      </button>
                    </td>
                  </tr>

                  {/* Section Header: Items Grid */}
                  <tr>
                    <td colSpan={4} className="excel-section-row" style={{ background: '#e0e7ff', color: '#3730a3', borderTop: '2px solid #a5b4fc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📦 {lang === 'mr' ? 'इनव्हॉईस वस्तू व जीएसटी तक्ता (Tax Invoice Line Items & GST)' : 'Tax Invoice Line Items & GST Rates'}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#fff', color: '#3730a3', borderColor: '#a5b4fc', fontSize: 11, padding: '3px 8px' }}
                            onClick={() => {
                              const newProd = window.prompt(
                                lang === 'mr' ? 'यादीत जोडण्यासाठी नवीन उत्पादनाचे नाव प्रविष्ट करा:' : 'Enter new product name to add to master dropdown:'
                              );
                              if (newProd && newProd.trim()) {
                                const updatedList = addStoredProduct(newProd.trim());
                                setProductList(updatedList);
                                setMsg({
                                  type: 'success',
                                  text: (lang === 'mr' ? 'नवीन उत्पादन यादीत जोडले: ' : 'New product added: ') + newProd.trim()
                                });
                              }
                            }}
                          >
                            <FolderPlus size={12} /> {lang === 'mr' ? '+ नवीन वस्तू' : '+ New Item'}
                          </button>
                          {!editingId && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ background: '#fff', fontSize: 11, padding: '3px 8px' }}
                              onClick={addRow}
                            >
                              <Plus size={12} /> {lang === 'mr' ? '+ ओळ जोडा' : '+ Add Row'}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Vertically Aligned Items Row-by-Row */}
                  {items.map((row, idx) => (
                    <React.Fragment key={row.id}>
                      {/* Item Header / Separator */}
                      <tr style={{ background: '#eef2ff', borderTop: idx > 0 ? '2px solid #c7d2fe' : '1px solid #e0e7ff' }}>
                        <td className="excel-row-idx" style={{ fontWeight: 800, color: '#4338ca', background: '#e0e7ff' }}>
                          #{idx + 1}
                        </td>
                        <td className="excel-col-label" style={{ fontWeight: 800, color: '#4338ca', fontSize: 13, background: '#eef2ff' }}>
                          <span>📦 {lang === 'mr' ? `इनव्हॉईस वस्तू क्र. ${idx + 1}` : `Tax Invoice Item #${idx + 1}`}</span>
                        </td>
                        <td className="excel-col-input" style={{ background: '#eef2ff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                            <span style={{ fontWeight: 800, color: '#4f46e5' }}>
                              {lang === 'mr' ? 'एकूण:' : 'Line Total:'} ₹{safeNum(row.total_amount).toFixed(2)}
                            </span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#475569', fontWeight: 600 }}>
                              Qty: {row.qty} @ ₹{safeNum(row.rate).toFixed(2)}
                            </span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#6366f1' }}>
                              HSN: {row.hsn_code || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="excel-col-tools" style={{ background: '#eef2ff' }}>
                          {items.length > 1 && !editingId && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Delete Item"
                              onClick={() => removeRow(idx)}
                            >
                              <Trash2 size={12} /> {lang === 'mr' ? 'वस्तू हटवा' : 'Remove Item'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Item Field 1: Product Name */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.1</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'उत्पादनाचे नाव (Product Name)' : 'Product Name'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <SearchableCombobox
                            value={row.product_name}
                            onChange={val => updateRow(idx, 'product_name', val)}
                            options={productList}
                            onAddNewOption={newProd => {
                              const updatedList = addStoredProduct(newProd);
                              setProductList(updatedList);
                            }}
                            lang={lang}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#4338ca', fontWeight: 600 }}>{row.product_name || '—'}</span>
                        </td>
                      </tr>

                      {/* Item Field 2: HSN Code & Quantity */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.2</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'एचएसएन व प्रमाण (HSN Code & Qty)' : 'HSN Code & Quantity'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>HSN</span>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="3808"
                                style={{ width: 120, height: 38 }}
                                value={row.hsn_code}
                                onChange={e => updateRow(idx, 'hsn_code', e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Qty</span>
                              <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                placeholder="1"
                                style={{ width: 110, height: 38 }}
                                value={row.qty}
                                onChange={e => updateRow(idx, 'qty', e.target.value)}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            HSN: {row.hsn_code || '—'} | Qty: {row.qty}
                          </span>
                        </td>
                      </tr>

                      {/* Item Field 3: Rate per Unit & Base Amount */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.3</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'दर व मूळ रक्कम (Rate & Base Amount ₹)' : 'Rate per Unit & Base Amount (₹)'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{lang === 'mr' ? 'दर ₹' : 'Rate ₹'}</span>
                              <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="0.00"
                                style={{ width: 130, height: 38 }}
                                value={row.rate !== undefined && row.rate !== null ? row.rate : ''}
                                onChange={e => updateRow(idx, 'rate', e.target.value)}
                              />
                            </div>
                            <div>
                              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{lang === 'mr' ? 'करपूर्व मूळ रक्कम ₹' : 'Base Amount ₹'}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>₹{safeNum(row.amount).toFixed(2)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569' }}>
                            {row.qty} × ₹{safeNum(row.rate).toFixed(2)} = ₹{safeNum(row.amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>

                      {/* Item Field 4: SGST % & CGST % */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.4</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'जीएसटी कर दर (SGST & CGST %)' : 'SGST & CGST GST Rates (%)'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>SGST %</span>
                              <select
                                className="form-select"
                                style={{ width: 110, height: 38 }}
                                value={row.sgst_rate}
                                onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                              >
                                <option value="0">0%</option>
                                <option value="2.5">2.5%</option>
                                <option value="6">6%</option>
                                <option value="9">9%</option>
                                <option value="14">14%</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CGST %</span>
                              <select
                                className="form-select"
                                style={{ width: 110, height: 38 }}
                                value={row.cgst_rate}
                                onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                              >
                                <option value="0">0%</option>
                                <option value="2.5">2.5%</option>
                                <option value="6">6%</option>
                                <option value="9">9%</option>
                                <option value="14">14%</option>
                              </select>
                            </div>
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            SGST: ₹{safeNum(row.sgst_amount).toFixed(2)} | CGST: ₹{safeNum(row.cgst_amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>

                      {/* Item Field 5: Line Total (₹) */}
                      <tr style={{ background: '#f8fafc' }}>
                        <td className="excel-row-idx" style={{ color: '#4f46e5', fontWeight: 800, fontSize: 11 }}>{idx + 1}.5</td>
                        <td className="excel-col-label">
                          <span style={{ fontWeight: 700, color: '#4338ca' }}>
                            {lang === 'mr' ? 'वस्तू एकूण रक्कम ₹ (Line Total)' : 'Item Line Total (₹)'}
                          </span>
                        </td>
                        <td className="excel-col-input">
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#4f46e5' }}>
                            ₹{safeNum(row.total_amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#4338ca', fontWeight: 600 }}>
                            Base ₹{safeNum(row.amount).toFixed(2)} + GST ₹{(safeNum(row.sgst_amount) + safeNum(row.cgst_amount)).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* Add Row Button Row */}
                  {!editingId && (
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 16px', background: '#eef2ff', borderTop: '1px dashed #a5b4fc', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ background: '#fff', color: '#4338ca', borderColor: '#a5b4fc', fontWeight: 700, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={addRow}
                        >
                          <Plus size={14} /> {lang === 'mr' ? '+ आणखी एक इनव्हॉईस वस्तू जोडा' : '+ Add Another Invoice Item'}
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Section Header: Summary */}
                  <tr>
                    <td colSpan={4} className="excel-section-row" style={{ background: '#f8fafc', color: '#334155' }}>
                      📊 {lang === 'mr' ? 'आर्थिक सारांश व एकूण कर गणना (Financial Summary & GST Totals)' : 'Financial Summary & GST Totals'}
                    </td>
                  </tr>

                  {/* Row: Subtotal Base Amount */}
                  <tr>
                    <td className="excel-row-idx">4</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'मूळ रक्कम उप-एकूण (Base Subtotal)' : 'Base Subtotal (₹)'}</span>
                    </td>
                    <td className="excel-col-input">
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>
                        ₹{items.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#64748b' }}>Taxable base amount</span>
                    </td>
                  </tr>

                  {/* Row: SGST Total */}
                  <tr>
                    <td className="excel-row-idx">5</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'एकूण एसजीएसटी (Total SGST)' : 'Total SGST (₹)'}</span>
                    </td>
                    <td className="excel-col-input">
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#4f46e5' }}>
                        ₹{items.reduce((s, r) => s + (r.sgst_amount || 0), 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#64748b' }}>State GST</span>
                    </td>
                  </tr>

                  {/* Row: CGST Total */}
                  <tr>
                    <td className="excel-row-idx">6</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'एकूण सीजीएसटी (Total CGST)' : 'Total CGST (₹)'}</span>
                    </td>
                    <td className="excel-col-input">
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#4f46e5' }}>
                        ₹{items.reduce((s, r) => s + (r.cgst_amount || 0), 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#64748b' }}>Central GST</span>
                    </td>
                  </tr>

                  {/* Row: Grand Total Amount */}
                  <tr style={{ background: '#eef2ff' }}>
                    <td className="excel-row-idx" style={{ fontWeight: 800, color: '#4338ca' }}>7</td>
                    <td className="excel-col-label">
                      <span style={{ fontWeight: 800, color: '#4338ca', fontSize: 14 }}>{lang === 'mr' ? 'एकूण इनव्हॉईस रक्कम ₹' : 'Grand Total Invoice (₹)'}</span>
                    </td>
                    <td className="excel-col-input">
                      <span style={{ fontWeight: 900, fontSize: 18, color: '#4338ca' }}>
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#4338ca', fontWeight: 700 }}>
                        {lang === 'mr' ? 'मूळ रक्कम + सर्व जीएसटी कर' : 'Base + SGST + CGST Total'}
                      </span>
                    </td>
                  </tr>

                  {/* Row: Document Attachment */}
                  <tr>
                    <td className="excel-row-idx">8</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'कागदपत्र / पावती स्कॅन / अपलोड' : 'Document Attachment / Scan'}</span>
                    </td>
                    <td className="excel-col-input">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="form-input"
                        style={{ maxWidth: 320, padding: '3px 6px', fontSize: 12 }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setDocPath(file.name);
                        }}
                      />
                    </td>
                    <td className="excel-col-tools">
                      {docPath ? (
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Attached: {docPath}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Optional image or PDF</span>
                      )}
                    </td>
                  </tr>

                  {/* Action Buttons Row */}
                  <tr>
                    <td colSpan={4} style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#4f46e5', borderColor: '#4f46e5' }}>
                          <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Invoice') : (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करा' : 'Save Tax Invoice'))}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={handleTranslateAllFields}
                          disabled={translating || loading}
                        >
                          {translating ? (
                            <>
                              <Loader2 size={16} className="spinner" />
                              {lang === 'mr' ? 'मराठीत भाषांतर करत आहे...' : 'Translating to Marathi...'}
                            </>
                          ) : (
                            <>
                              <Languages size={16} /> {lang === 'mr' ? 'मराठीत भाषांतर करा' : 'Translate to Marathi'}
                            </>
                          )}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleReset}>
                          {lang === 'mr' ? 'रीसेट' : 'Reset'}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODE 2: VERTICAL STACK VIEW                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {viewMode === 'vertical' && (
          <div>
            <div className="form-grid-4" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'इनव्हॉईस क्र. (Invoice No)' : 'Invoice No.'}</label>
            <input type="text" className="form-input" style={{ fontWeight: 700, color: '#2563eb' }} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">{lang === 'mr' ? 'ग्राहक नाव (Customer Name)' : 'Customer Name'}</label>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1e40af' }}>
              {lang === 'mr' ? 'इनव्हॉईस वस्तू व जीएसटी तक्ता (Tax Invoice Grid Items)' : 'Tax Invoice Grid Items'}
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ background: '#fff', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600 }}
                onClick={() => {
                  const newProd = window.prompt(
                    lang === 'mr'
                      ? 'यादीत जोडण्यासाठी नवीन उत्पादनाचे नाव प्रविष्ट करा:'
                      : 'Enter new product name to add to master list:'
                  );
                  if (newProd && newProd.trim()) {
                    const updatedList = addStoredProduct(newProd.trim());
                    setProductList(updatedList);
                    setMsg({
                      type: 'success',
                      text: (lang === 'mr' ? 'नवीन उत्पादन यादीत जोडले: ' : 'New product added to master dropdown: ') + newProd.trim()
                    });
                  }
                }}
              >
                <FolderPlus size={14} /> {lang === 'mr' ? 'नवीन वस्तू यादीत जोडा' : 'Add Custom Product'}
              </button>
              {!editingId && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} style={{ background: '#fff' }}>
                  <Plus size={14} /> {lang === 'mr' ? 'ओळ जोडा' : 'Add Item Row'}
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}>
                  <th style={{ width: 28, padding: '6px 4px' }}>#</th>
                  <th style={{ minWidth: 150, padding: '6px 4px' }}>{lang === 'mr' ? 'उत्पादनाचे नाव' : 'Product Name'}</th>
                  <th style={{ width: 80, padding: '6px 4px' }}>{lang === 'mr' ? 'एचएसएन' : 'HSN'}</th>
                  <th style={{ width: 60, padding: '6px 4px' }}>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th style={{ width: 80, padding: '6px 4px' }}>{lang === 'mr' ? 'दर' : 'Rate (₹)'}</th>
                  <th style={{ width: 85, padding: '6px 4px' }}>{lang === 'mr' ? 'मूळ रक्कम' : 'Base (₹)'}</th>
                  <th style={{ width: 70, padding: '6px 4px' }}>{lang === 'mr' ? 'एसजीएसटी %' : 'SGST %'}</th>
                  <th style={{ width: 70, padding: '6px 4px' }}>{lang === 'mr' ? 'सीजीएसटी %' : 'CGST %'}</th>
                  <th style={{ width: 95, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण' : 'Total (₹)'}</th>
                  <th style={{ width: 70, padding: '6px 4px', textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id} style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 4px', textIndent: 4 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 4px', minWidth: 220 }}>
                      <SearchableCombobox
                        value={row.product_name}
                        onChange={val => updateRow(idx, 'product_name', val)}
                        options={productList}
                        onAddNewOption={newProd => {
                          const updatedList = addStoredProduct(newProd);
                          setProductList(updatedList);
                        }}
                        lang={lang}
                      />
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
                        value={row.rate !== undefined && row.rate !== null ? row.rate : ''}
                        onChange={e => updateRow(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', fontWeight: 600 }}>
                      ₹{safeNum(row.amount).toFixed(2)}
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
                      ₹{safeNum(row.total_amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 6px', marginRight: 4, color: '#2563eb' }}
                        title="Save Row & Product"
                        onClick={() => {
                          if (row.product_name.trim()) {
                            const updatedList = addStoredProduct(row.product_name.trim());
                            setProductList(updatedList);
                          }
                          updateRow(idx, 'isCustomText', false);
                        }}
                      >
                        <Save size={12} />
                      </button>
                      {items.length > 1 && !editingId && (
                        <button type="button" className="btn btn-danger btn-sm" style={{ padding: '4px 6px' }} title="Delete Row" onClick={() => removeRow(idx)}>
                          <Trash2 size={12} />
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

        <div style={{ marginTop: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: 13, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 {lang === 'mr' ? 'कागदपत्र / पावती स्कॅन करा किंवा अपलोड करा:' : 'Scan & Upload Attachment Document:'}
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="form-input"
            style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) setDocPath(file.name);
            }}
          />
          {docPath && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Attached: {docPath}</span>}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#2563eb', borderColor: '#2563eb' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Invoice') : (lang === 'mr' ? 'टॅक्स इनव्हॉईस जतन करा' : 'Save Tax Invoice'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#bfdbfe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleTranslateAllFields}
            disabled={translating || loading}
          >
            {translating ? (
              <>
                <Loader2 size={16} className="spinner" />
                {lang === 'mr' ? 'मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : 'Translating to Marathi, please wait...'}
              </>
            ) : (
              <>
                <Languages size={16} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
        </div>
        )}
      </form>

      {/* History Register */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="filter-bar-group">
            <Calendar size={16} color="#2563eb" />
            <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी / संपूर्ण महिना:' : 'Filter Month / Date Range:'}</label>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13 }}>{lang === 'mr' ? 'ते' : 'to'}</span>
            <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filter-bar-spacer" />
          <div className="filter-bar-group">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              style={{ width: 240, padding: '4px 10px', fontSize: 13 }}
              placeholder={lang === 'mr' ? 'ग्राहक नाव, इनव्हॉईस क्र. शोधा...' : 'Search Customer, Invoice No...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>


        {/* Total Summary Metrics Cards */}
        {(() => {
          const safeNum = (val: any): number => {
            const n = parseFloat(String(val));
            return isNaN(n) ? 0 : n;
          };
          const totalInvoiceSales = filteredHistory.reduce((acc, r) => {
            const qty = safeNum(r.qty);
            const rate = safeNum(r.rate);
            const base = qty * rate;
            const sgst = safeNum(r.sgst_amount ?? (base * 0.09));
            const cgst = safeNum(r.cgst_amount ?? (base * 0.09));
            const tot = safeNum(r.total_amount ?? (base + sgst + cgst));
            return acc + tot;
          }, 0);

          const totalBasePurchases = filteredHistory.reduce((acc, r) => acc + (safeNum(r.qty) * safeNum(r.rate)), 0);
          const totalTaxCollected = filteredHistory.reduce((acc, r) => {
            const base = safeNum(r.qty) * safeNum(r.rate);
            return acc + safeNum(r.sgst_amount ?? (base * 0.09)) + safeNum(r.cgst_amount ?? (base * 0.09));
          }, 0);

          return (
            <div className="form-grid-3" style={{ marginBottom: 16 }}>
              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण टॅक्स इनव्हॉईस विक्री' : 'Total Tax Invoice Sales'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
                  ₹{totalInvoiceSales.toFixed(2)}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण मूळ रक्कम' : 'Total Base Sales Value'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                  ₹{totalBasePurchases.toFixed(2)}
                </div>
              </div>

              <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण जीएसटी कर (SGST + CGST)' : 'Total GST Tax Amount'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#9a3412', marginTop: 4 }}>
                  ₹{totalTaxCollected.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}

        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणताही टॅक्स इनव्हॉईस आढळला नाही.' : 'No tax invoices found for selected date range.'}
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
                  <th>{lang === 'mr' ? 'पॅक आकार' : 'Pack Size'}</th>
                  <th>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th>{lang === 'mr' ? 'दर' : 'Rate'}</th>
                  <th>{lang === 'mr' ? 'एसजीएसटी' : 'SGST'}</th>
                  <th>{lang === 'mr' ? 'सीजीएसटी' : 'CGST'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'एकूण (₹)' : 'Total (₹)'}</th>
                  <th>{lang === 'mr' ? 'कागदपत्र' : 'Attachment'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => {
                  const safeNum = (val: any): number => {
                    const n = parseFloat(String(val));
                    return isNaN(n) ? 0 : n;
                  };
                  const qty = safeNum(row.qty);
                  const rate = safeNum(row.rate);
                  const base = qty * rate;
                  const sgstVal = safeNum(row.sgst_amount ?? (base * 0.09));
                  const cgstVal = safeNum(row.cgst_amount ?? (base * 0.09));
                  const totalVal = safeNum(row.total_amount ?? (base + sgstVal + cgstVal));

                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.invoice_no}</td>
                      <td>{row.date}</td>
                      <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                      <td>{lang === 'mr' ? getMarathiItem(row.product_name) : row.product_name}</td>
                      <td style={{ fontWeight: 600, color: '#475569' }}>{row.pack_size || '1 Ltr / Pkt'}</td>
                      <td>{qty}</td>
                      <td>₹{rate.toFixed(2)}</td>
                      <td>₹{sgstVal.toFixed(2)}</td>
                      <td>₹{cgstVal.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{totalVal.toFixed(2)}</td>
                      <td>
                        {row.doc_path ? (
                          <a href={`#`} onClick={(e) => { e.preventDefault(); alert(`Downloading attachment: ${row.doc_path}`); }} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '2px 6px' }}>
                            📎 Doc
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, padding: '4px 6px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Invoice">
                          <Edit size={13} /> {lang === 'mr' ? 'संपादित' : 'Edit'}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setSelectedInvoiceForPrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#2563eb', borderColor: '#2563eb' }} title="Print Invoice">
                          <Printer size={13} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} style={{ padding: '4px 6px' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                  BELGAUM GARDENERS CO-OP PRODUCTION SUPPLY AND SALE SOCIETY LTD.
                </h3>
                <div style={{ fontSize: 11, fontWeight: 'bold', margin: '4px 0', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>📍 Address: Belgaum, Karnataka - 590001</span>
                  <span>📞 Phone: 0831-2401234 / 0831-2401235</span>
                  <span>🆔 GSTN: 29AAATB1234C1Z5</span>
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
