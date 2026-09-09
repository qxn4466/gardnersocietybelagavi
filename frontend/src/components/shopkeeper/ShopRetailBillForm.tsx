import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, ShoppingCart, X, Languages, Check, FolderPlus, Loader2, Table, List } from 'lucide-react';
import { createShopRetailBill, updateShopRetailBill, fetchShopRetailBills, deleteShopRetailBill } from '../../api/client';
import type { ShopRetailBill, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi, getMarathiItem } from '../../utils/translator';
import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';
import SearchableCombobox from '../SearchableCombobox';

interface ShopRetailBillFormProps {
  user?: User | null;
}

interface RetailBillRow {
  id: string;
  particulars: string;
  isCustomText?: boolean;
  qty: number;
  rate: number;
  amount: number;
  sgst_rate: number;
  sgst_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  total_amount: number;
}

const ShopRetailBillForm: React.FC<ShopRetailBillFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [editingId, setEditingId] = useState<number | null>(null);

  const [date, setDate] = useState(today);
  const [billNo, setBillNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [docPath, setDocPath] = useState('');

  const [viewMode, setViewMode] = useState<'excel' | 'vertical'>(() => {
    return (localStorage.getItem('bgs_shop_retail_view_mode') as 'excel' | 'vertical') || 'excel';
  });

  const handleViewModeChange = (mode: 'excel' | 'vertical') => {
    setViewMode(mode);
    localStorage.setItem('bgs_shop_retail_view_mode', mode);
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
      updateRow(index, 'particulars', newProd.trim());
    }
  };

  // Multi-item addable grid rows with SGST & CGST
  const [items, setItems] = useState<RetailBillRow[]>([
    {
      id: '1',
      particulars: PESTICIDE_PRODUCT_LIST[0],
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

  const [history, setHistory] = useState<ShopRetailBill[]>([]);

  // Print Modals
  const [showRangePrintModal, setShowRangePrintModal] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<ShopRetailBill | null>(null);

  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');
  const loadedEditRef = useRef<string | null>(null);

  useEffect(() => {
    loadHistory();
    setBillNo(`SRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  }, [startDate, endDate, editParam]);

  useEffect(() => {
    if (editParam && history.length > 0 && loadedEditRef.current !== editParam) {
      const numericId = parseInt(editParam);
      const match = history.find(h =>
        h.id === numericId ||
        h.bill_no === editParam ||
        (h.bill_no && editParam.includes(h.bill_no)) ||
        (h.bill_no && h.bill_no.includes(editParam))
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
        ? await fetchShopRetailBills()
        : await fetchShopRetailBills(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const updateRow = (index: number, field: keyof RetailBillRow, val: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: val };

    const q = parseFloat(String(row.qty)) || 1;
    const r = parseFloat(String(row.rate)) || 0;
    const baseAmt = q * r;
    row.amount = baseAmt;

    const sgstPct = parseFloat(String(row.sgst_rate)) || 0;
    const cgstPct = parseFloat(String(row.cgst_rate)) || 0;

    const sgstAmt = (baseAmt * sgstPct) / 100;
    const cgstAmt = (baseAmt * cgstPct) / 100;

    row.sgst_amount = sgstAmt;
    row.cgst_amount = cgstAmt;
    row.total_amount = baseAmt + sgstAmt + cgstAmt;

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

  const grandBaseAmount = items.reduce((s, r) => s + (r.amount || 0), 0);
  const grandSGSTAmount = items.reduce((s, r) => s + (r.sgst_amount || 0), 0);
  const grandCGSTAmount = items.reduce((s, r) => s + (r.cgst_amount || 0), 0);
  const grandTotalAmount = items.reduce((s, r) => s + (r.total_amount || (r.amount + (r.sgst_amount || 0) + (r.cgst_amount || 0))), 0);

  const handleReset = () => {
    setEditingId(null);
    setDate(today);
    setBillNo(`SRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomerName('');
    setItems([
      {
        id: '1',
        particulars: PESTICIDE_PRODUCT_LIST[0],
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

  const handleEdit = (bill: ShopRetailBill) => {
    setEditingId(bill.id);
    setDate(bill.date);
    setBillNo(bill.bill_no);
    setCustomerName(bill.customer_name);
    const baseAmt = safeNum(bill.amount);
    const sgstPct = safeNum(bill.sgst_rate) || 9;
    const sgstAmt = safeNum(bill.sgst_amount) || ((baseAmt * sgstPct) / 100);
    const cgstPct = safeNum(bill.cgst_rate) || 9;
    const cgstAmt = safeNum(bill.cgst_amount) || ((baseAmt * cgstPct) / 100);
    const totAmt = safeNum(bill.total_amount) || (baseAmt + sgstAmt + cgstAmt);

    setItems([
      {
        id: bill.id.toString(),
        particulars: bill.particulars || PESTICIDE_PRODUCT_LIST[0],
        qty: safeNum(bill.qty) || 1,
        rate: safeNum(bill.rate),
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
          particulars: await translateToMarathi(item.particulars),
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
    if (grandTotalAmount <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया प्रमाण व दर प्रविष्ट करा.' : 'Please enter valid Qty and Rate for items.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      if (editingId) {
        const item = items[0];
        await updateShopRetailBill(editingId, {
          date,
          bill_no: billNo,
          customer_name: customerName.trim(),
          particulars: item.particulars,
          qty: Number(item.qty) || 1,
          rate: Number(item.rate) || 0,
          amount: item.amount,
          sgst_rate: item.sgst_rate,
          sgst_amount: item.sgst_amount,
          cgst_rate: item.cgst_rate,
          cgst_amount: item.cgst_amount,
          total_amount: item.total_amount,
          created_by: user?.username || 'shopkeeper',
        });
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'किरकोळ रोख बिल अपडेट केले!' : 'Retail cash bill updated successfully!'
        });
      } else {
        for (const item of items) {
          if (item.total_amount > 0 || item.amount > 0) {
            await createShopRetailBill({
              date,
              bill_no: billNo,
              customer_name: customerName.trim(),
              particulars: item.particulars,
              qty: Number(item.qty) || 1,
              rate: Number(item.rate) || 0,
              amount: item.amount,
              sgst_rate: item.sgst_rate,
              sgst_amount: item.sgst_amount,
              cgst_rate: item.cgst_rate,
              cgst_amount: item.cgst_amount,
              total_amount: item.total_amount,
              created_by: user?.username || 'shopkeeper',
            });
            recordSale(item.particulars, Number(item.qty) || 1, Number(item.rate) || 0, date);
          }
        }
        setMsg({
          type: 'success',
          text: (lang === 'mr' ? 'किरकोळ रोख बिल जतन केले!' : 'Retail Cash Bill saved successfully!') +
            (lang === 'mr' ? ' (ऑटो-कीटकनाशके नोंदवहीत जोडली गेली)' : ' (Auto-posted to Pesticide Register if applicable)')
        });
      }

      loadHistory();
      handleReset();
    } catch {
      setMsg({ type: 'error', text: lang === 'mr' ? 'रोख बिल जतन करताना त्रुटी आली.' : 'Error saving shop retail bill.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'mr' ? 'तुम्हाला हे रोख बिल हटवायचे आहे का?' : 'Are you sure you want to delete this retail cash bill?')) return;
    try {
      await deleteShopRetailBill(id);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const filteredHistory = history.filter(row =>
    row.bill_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.particulars.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #ea580c', boxShadow: '0 4px 16px rgba(234, 88, 12, 0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#ffedd5', padding: 10, borderRadius: 8, color: '#c2410c' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              4. {lang === 'mr' ? 'दुकानाचे किरकोळ रोख बिल (Retail Cash Bill)' : 'Shop Retail Cash Bill'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'किरकोळ रोख बिल नोंद · कीटकनाशके नोंदवहीत स्वयंचलित नोंद' : 'Retail Cash Bill Entry · Auto-posts to Pesticide Register & GL'}
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
                background: viewMode === 'excel' ? '#ea580c' : 'transparent',
                color: viewMode === 'excel' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
              id="retail-excel-view-btn"
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
              id="retail-vertical-view-btn"
            >
              <List size={14} /> {lang === 'mr' ? 'उभी मांडणी' : 'Vertical Stack'}
            </button>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setShowRangePrintModal(true)} style={{ background: '#ea580c', borderColor: '#ea580c' }}>
            <Printer size={14} /> {lang === 'mr' ? 'महिना / कालावधी रजिस्टर प्रिंट करा' : 'Print Month / Range Register'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन फॉर्म' : 'New Form'}
          </button>
        </div>
      </div>

      {/* Official Sub-banner matching specs */}
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#c2410c' }}>
            {lang === 'mr' ? 'द बेळगाव गार्डनर्स को-ऑप. प्रॉडक्शन सप्लाय अँड सेल सोसायटी लि., बेळगाव' : 'The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>TIN: 29540268502 | PPO / INSAT / BLG/48</div>
        </div>
        <div style={{ fontWeight: 700, color: '#9a3412', fontSize: 13 }}>
          Phone No.: 2460534
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
            ✏️ Edit Mode: Updating Retail Cash Bill #{editingId} ({billNo})
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
                <Table size={16} color="#ea580c" />
                <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                  {lang === 'mr' ? 'दुकानाचे किरकोळ रोख बिल नोंद (एक्सेल ग्रिड)' : 'SHOP_RETAIL_BILL_SHEET (Excel Grid)'}
                </span>
                <span style={{ fontSize: 10, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
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
                  {/* Row 1: Retail Bill No */}
                  <tr>
                    <td className="excel-row-idx">1</td>
                    <td className="excel-col-label">
                      <span>{lang === 'mr' ? 'रोख बिल क्र. (Bill No)' : 'Retail Bill No.'}</span>
                      <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                    </td>
                    <td className="excel-col-input">
                      <input
                        type="text"
                        className="form-input"
                        style={{ maxWidth: 280, height: 38, fontWeight: 700, color: '#ea580c' }}
                        value={billNo}
                        onChange={e => setBillNo(e.target.value)}
                        required
                      />
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{billNo}</span>
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
                        style={{ background: 'none', border: 'none', color: '#ea580c', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {translating ? <Loader2 size={12} className="spinner" /> : <Languages size={12} />}
                        {lang === 'mr' ? 'मराठीत भाषांतर करा' : 'Translate to Marathi'}
                      </button>
                    </td>
                  </tr>

                  {/* Section Header: Items Grid */}
                  <tr>
                    <td colSpan={4} className="excel-section-row" style={{ background: '#ffedd5', color: '#9a3412', borderTop: '2px solid #fed7aa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📦 {lang === 'mr' ? 'किरकोळ विक्री वस्तू तक्ता (Retail Cash Bill Grid Items)' : 'Retail Cash Bill Grid Items & GST Rates'}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#fff', color: '#9a3412', borderColor: '#fed7aa', fontSize: 11, padding: '3px 8px' }}
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
                      <tr style={{ background: '#fff7ed', borderTop: idx > 0 ? '2px solid #fed7aa' : '1px solid #ffedd5' }}>
                        <td className="excel-row-idx" style={{ fontWeight: 800, color: '#c2410c', background: '#ffedd5' }}>
                          #{idx + 1}
                        </td>
                        <td className="excel-col-label" style={{ fontWeight: 800, color: '#c2410c', fontSize: 13, background: '#fff7ed' }}>
                          <span>📦 {lang === 'mr' ? `किरकोळ बिल वस्तू क्र. ${idx + 1}` : `Retail Bill Item #${idx + 1}`}</span>
                        </td>
                        <td className="excel-col-input" style={{ background: '#fff7ed' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                            <span style={{ fontWeight: 800, color: '#ea580c' }}>
                              {lang === 'mr' ? 'एकूण:' : 'Line Total:'} ₹{safeNum(row.total_amount).toFixed(2)}
                            </span>
                            <span style={{ color: '#fed7aa' }}>|</span>
                            <span style={{ color: '#475569', fontWeight: 600 }}>
                              Qty: {row.qty} @ ₹{safeNum(row.rate).toFixed(2)}
                            </span>
                            <span style={{ color: '#fed7aa' }}>|</span>
                            <span style={{ color: '#c2410c', fontWeight: 600 }}>
                              {row.particulars || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="excel-col-tools" style={{ background: '#fff7ed' }}>
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

                      {/* Item Field 1: Particulars / Item Name */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.1</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'तपशील / उत्पादन नाव' : 'Particulars / Item Name'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <SearchableCombobox
                            value={row.particulars}
                            onChange={val => updateRow(idx, 'particulars', val)}
                            options={productList}
                            onAddNewOption={newProd => {
                              const updatedList = addStoredProduct(newProd);
                              setProductList(updatedList);
                            }}
                            lang={lang}
                          />
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>{row.particulars || '—'}</span>
                        </td>
                      </tr>

                      {/* Item Field 2: Quantity & Rate */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.2</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'प्रमाण व दर (Qty & Rate ₹)' : 'Quantity & Rate per Unit (₹)'}</span>
                          <span className="required" style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
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
                          </div>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                            Qty: {row.qty} @ ₹{safeNum(row.rate).toFixed(2)}
                          </span>
                        </td>
                      </tr>

                      {/* Item Field 3: Base Amount & GST Rates */}
                      <tr>
                        <td className="excel-row-idx" style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}.3</td>
                        <td className="excel-col-label">
                          <span>{lang === 'mr' ? 'करपूर्व रक्कम व जीएसटी दर' : 'Base Amount & GST Rates'}</span>
                        </td>
                        <td className="excel-col-input">
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{lang === 'mr' ? 'मूळ रक्कम ₹' : 'Base Amount ₹'}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>₹{safeNum(row.amount).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>SGST %</span>
                              <select
                                className="form-select"
                                style={{ width: 100, height: 38 }}
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
                                style={{ width: 100, height: 38 }}
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

                      {/* Item Field 4: Line Total (₹) */}
                      <tr style={{ background: '#f8fafc' }}>
                        <td className="excel-row-idx" style={{ color: '#ea580c', fontWeight: 800, fontSize: 11 }}>{idx + 1}.4</td>
                        <td className="excel-col-label">
                          <span style={{ fontWeight: 700, color: '#c2410c' }}>
                            {lang === 'mr' ? 'वस्तू एकूण रक्कम ₹ (Line Total)' : 'Item Line Total (₹)'}
                          </span>
                        </td>
                        <td className="excel-col-input">
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#ea580c' }}>
                            ₹{safeNum(row.total_amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="excel-col-tools">
                          <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>
                            Base ₹{safeNum(row.amount).toFixed(2)} + GST ₹{(safeNum(row.sgst_amount) + safeNum(row.cgst_amount)).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* Add Row Button Row */}
                  {!editingId && (
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 16px', background: '#fff7ed', borderTop: '1px dashed #fed7aa', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ background: '#fff', color: '#c2410c', borderColor: '#fed7aa', fontWeight: 700, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={addRow}
                        >
                          <Plus size={14} /> {lang === 'mr' ? '+ आणखी एक रोख बिल वस्तू जोडा' : '+ Add Another Retail Bill Item'}
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
                        ₹{grandBaseAmount.toFixed(2)}
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
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#ea580c' }}>
                        ₹{grandSGSTAmount.toFixed(2)}
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
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#ea580c' }}>
                        ₹{grandCGSTAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#64748b' }}>Central GST</span>
                    </td>
                  </tr>

                  {/* Row: Grand Total Amount */}
                  <tr style={{ background: '#fff7ed' }}>
                    <td className="excel-row-idx" style={{ fontWeight: 800, color: '#c2410c' }}>7</td>
                    <td className="excel-col-label">
                      <span style={{ fontWeight: 800, color: '#c2410c', fontSize: 14 }}>{lang === 'mr' ? 'एकूण रोख बिल रक्कम ₹' : 'Grand Total Bill Amount (₹)'}</span>
                    </td>
                    <td className="excel-col-input">
                      <span style={{ fontWeight: 900, fontSize: 18, color: '#c2410c' }}>
                        ₹{grandTotalAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="excel-col-tools">
                      <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>
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
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#ea580c', borderColor: '#ea580c' }}>
                          <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Bill') : (lang === 'mr' ? 'रोख बिल जतन करा' : 'Save Retail Bill'))}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ background: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
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
            <label className="form-label">{lang === 'mr' ? 'रोख बिल क्र. (Bill No)' : 'Retail Bill No.'}</label>
            <input type="text" className="form-input" style={{ fontWeight: 700, color: '#ea580c' }} value={billNo} onChange={e => setBillNo(e.target.value)} required />
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
        <div style={{ background: '#fff7ed', padding: 18, borderRadius: 8, border: '1px solid #fed7aa', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#c2410c' }}>
              {lang === 'mr' ? 'किरकोळ विक्री वस्तू तक्ता (Retail Cash Bill Grid Items)' : 'Retail Cash Bill Grid Items'}
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ background: '#fff', color: '#c2410c', borderColor: '#fdba74', fontWeight: 600 }}
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
                <tr style={{ background: '#ffedd5', borderBottom: '2px solid #fdba74' }}>
                  <th style={{ width: 28, padding: '6px 4px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: 160, padding: '6px 4px', textAlign: 'left' }}>{lang === 'mr' ? 'तपशील / उत्पादन' : 'Particulars / Product'}</th>
                  <th style={{ width: 65, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th style={{ width: 85, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'दर' : 'Rate (₹)'}</th>
                  <th style={{ width: 95, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'पायाभूत रक्कम' : 'Base Amt (₹)'}</th>
                  <th style={{ width: 70, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'SGST %' : 'SGST %'}</th>
                  <th style={{ width: 70, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'CGST %' : 'CGST %'}</th>
                  <th style={{ width: 110, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total (₹)'}</th>
                  <th style={{ width: 70, padding: '6px 4px', textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id} style={{ background: '#fff', borderBottom: '1px solid #fed7aa' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 4px', minWidth: 160 }}>
                      <SearchableCombobox
                        value={row.particulars}
                        onChange={val => updateRow(idx, 'particulars', val)}
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
                        type="number"
                        step="0.1"
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}
                        value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}
                        value={row.rate !== undefined && row.rate !== null ? row.rate : ''}
                        onChange={e => updateRow(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                      ₹{safeNum(row.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}
                        value={row.sgst_rate}
                        onChange={e => updateRow(idx, 'sgst_rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}
                        value={row.cgst_rate}
                        onChange={e => updateRow(idx, 'cgst_rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#ea580c', fontSize: 13, fontFamily: 'monospace' }}>
                      ₹{safeNum(row.total_amount || (row.amount + row.sgst_amount + row.cgst_amount)).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 6px', marginRight: 4, color: '#ea580c' }}
                        title="Save Row & Product"
                        onClick={() => {
                          if (row.particulars.trim()) {
                            const updatedList = addStoredProduct(row.particulars.trim());
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

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: 12, color: '#9a3412', display: 'flex', gap: 16 }}>
              <span>Base Amt: <strong>₹{grandBaseAmount.toFixed(2)}</strong></span>
              <span>SGST: <strong>₹{grandSGSTAmount.toFixed(2)}</strong></span>
              <span>CGST: <strong>₹{grandCGSTAmount.toFixed(2)}</strong></span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#c2410c' }}>
              {lang === 'mr' ? 'एकूण बिल रक्कम (सगळे करांसह):' : 'Grand Total (Inc. Taxes):'} ₹{grandTotalAmount.toFixed(2)}
            </div>
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
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#ea580c', borderColor: '#ea580c' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Bill') : (lang === 'mr' ? 'रोख बिल जतन करा' : 'Save Retail Bill'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#ffedd5', color: '#c2410c', borderColor: '#fdba74', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
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

      {/* Date Range Filter Bar & Search Input Bar */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#ea580c" />
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
              placeholder={lang === 'mr' ? 'बिल क्र. किंवा नाव शोधा...' : 'Search Bill No, Customer Name...'}
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
          const totalRetailSales = filteredHistory.reduce((acc, r) => acc + safeNum(r.total_amount || r.amount), 0);
          const totalRetailCount = filteredHistory.length;

          return (
            <div className="form-grid-3" style={{ marginBottom: 16 }}>
              <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण किरकोळ रोख विक्री (Total Retail Cash Sales)' : 'Total Retail Cash Sales'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
                  ₹{totalRetailSales.toFixed(2)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण पावती संख्या (Total Bills Count)' : 'Total Retail Bills Count'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                  {totalRetailCount} {lang === 'mr' ? 'पावत्या' : 'Bills'}
                </div>
              </div>
            </div>
          );
        })()}

        {/* History Register Table with Marathi Header Translation */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही बिल नोंदी आढळल्या नाहीत.' : 'No retail bills found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff7ed', borderBottom: '2px solid #fdba74' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 120 }}>{lang === 'mr' ? 'बिल क्र.' : 'Bill / Invoice No.'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 95 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 140 }}>{lang === 'mr' ? 'ग्राहकाचे नाव' : 'Customer Name'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 140 }}>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 85 }}>{lang === 'mr' ? 'पॅक आकार' : 'Pack Size'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 55 }}>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 80 }}>{lang === 'mr' ? 'दर (₹)' : 'Rate (₹)'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>{lang === 'mr' ? 'पायाभूत' : 'Base (₹)'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 75 }}>SGST</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 75 }}>CGST</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 100, color: '#ea580c' }}>{lang === 'mr' ? 'एकूण (₹)' : 'Total (₹)'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 75 }}>{lang === 'mr' ? 'कागदपत्र' : 'Attachment'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 120 }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => {
                  const safeNum = (val: any): number => {
                    const n = parseFloat(String(val));
                    return isNaN(n) ? 0 : n;
                  };
                  const baseAmt = safeNum(row.amount);
                  const rate = safeNum(row.rate);
                  const qty = safeNum(row.qty || (rate > 0 ? baseAmt / rate : 1));

                  const sgstAmt = safeNum(row.sgst_amount || ((baseAmt * (row.sgst_rate ?? 9)) / 100));
                  const cgstAmt = safeNum(row.cgst_amount || ((baseAmt * (row.cgst_rate ?? 9)) / 100));
                  const totAmt = safeNum(row.total_amount || (baseAmt + sgstAmt + cgstAmt));

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>{row.bill_no}</td>
                      <td style={{ textAlign: 'left', padding: '8px 6px', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>{row.customer_name}</td>
                      <td style={{ textAlign: 'left', padding: '8px 6px' }}>{lang === 'mr' ? getMarathiItem(row.particulars) : row.particulars}</td>
                      <td style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600, color: '#475569' }}>{row.pack_size || '1 Ltr / Pkt'}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 600 }}>{qty}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{rate.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{baseAmt.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{sgstAmt.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{cgstAmt.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#ea580c' }}>₹{totAmt.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                        {row.doc_path ? (
                          <a href={`#`} onClick={(e) => { e.preventDefault(); alert(`Downloading attachment: ${row.doc_path}`); }} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '2px 6px' }}>
                            📎 Doc
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, padding: '4px 6px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Bill">
                          <Edit size={13} /> {lang === 'mr' ? 'संपादित' : 'Edit'}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setSelectedBillForPrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#ea580c', borderColor: '#ea580c' }} title="Print Bill">
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

      {/* Single Bill Print Modal */}
      {selectedBillForPrint && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 650, padding: 30, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700 }}>Retail Cash Bill Print #{selectedBillForPrint.bill_no}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#ea580c', borderColor: '#ea580c' }}>
                  <Printer size={14} /> Print Bill
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBillForPrint(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-retail-bill" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                  BELGAUM GARDENERS CO-OP PRODUCTION SUPPLY AND SALE SOCIETY LTD.
                </h3>
                <div style={{ fontSize: 11, fontWeight: 'bold', margin: '4px 0', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>📍 Address: 930/1A Zanda Chowk Market, Belgaum 590002</span>
                  <span>📞 Phone: 0831-2400123 / 0831-2400124</span>
                  <span>🆔 GSTN: 29AAAAB1234C1Z5</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10, textDecoration: 'underline' }}>
                  RETAIL CASH BILL
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16, borderBottom: '1px solid #000', paddingBottom: 8 }}>
                <div>
                  <div><strong>Bill No:</strong> {selectedBillForPrint.bill_no}</div>
                  <div><strong>Customer Name:</strong> {selectedBillForPrint.customer_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Date:</strong> {selectedBillForPrint.date}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Particulars / Product</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>{selectedBillForPrint.particulars}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>{selectedBillForPrint.qty}</td>
                    <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(selectedBillForPrint.rate).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(selectedBillForPrint.amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
                <div>Customer Signature<br /><br />_______________</div>
                <div>Shop Keeper Signature<br /><br />_______________</div>
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
              <h4 style={{ fontWeight: 700 }}>Shop Retail Cash Bills Register Print ({startDate} to {endDate})</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#ea580c', borderColor: '#ea580c' }}>
                  <Printer size={14} /> Print Register
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRangePrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-retail-register" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
                  The Belgaum Gardeners Co-op. Production Supply and Sale Society Ltd., Belgaum.
                </h3>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 4, textDecoration: 'underline' }}>
                  RETAIL CASH BILLS REGISTER
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {startDate} to {endDate}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Bill No.</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Customer Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Particulars / Product</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.bill_no}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.customer_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.particulars}</td>
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
                <div>Accountant Signature<br /><br />_______________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopRetailBillForm;
