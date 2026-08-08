import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, Tag, X, Languages, Check, FolderPlus, Zap, Loader2 } from 'lucide-react';

import { createSellingRateEntry, updateSellingRateEntry, fetchSellingRateEntries, deleteSellingRateEntry, generate30DaysTestData, delete30DaysTestData } from '../../api/client';


import type { ShopSellingRateEntry, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi, getMarathiItem } from '../../utils/translator';
import { getStoredProducts, addStoredProduct } from '../../utils/productStore';
import SearchableCombobox from '../SearchableCombobox';


interface SellingRateBookFormProps {
  user?: User | null;
}

interface SellingRateRow {
  id: string;
  particulars: string;
  isCustomText?: boolean;
  qty: number;
  unit: string;
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

  const [editingId, setEditingId] = useState<number | null>(null);

  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [stockBookNo, setStockBookNo] = useState('');
  const [signStatus, setSignStatus] = useState('Signed');
  const [docPath, setDocPath] = useState('');

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowForPrint, setSelectedRowForPrint] = useState<ShopSellingRateEntry | null>(null);

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

  // Multi-item addable grid rows
  const [items, setItems] = useState<SellingRateRow[]>([
    {
      id: '1',
      particulars: PESTICIDE_PRODUCT_LIST[0],
      qty: 1,
      unit: 'kg',
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
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
        unit: 'kg',
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
    setEditingId(null);
    setDate(today);
    setName('');
    setStockBookNo('');
    setSignStatus('Signed');
    setItems([
      {
        id: '1',
        particulars: PESTICIDE_PRODUCT_LIST[0],
        qty: 1,
        unit: 'kg',
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

  const handleEdit = (entry: ShopSellingRateEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setName(entry.name);
    setStockBookNo(entry.stock_book_no || '');
    setSignStatus(entry.sign_status || 'Signed');
    setItems([
      {
        id: entry.id.toString(),
        particulars: entry.particulars,
        qty: entry.qty,
        unit: entry.unit || entry.pack_size || 'kg',
        amount: entry.amount,
        sgst: entry.sgst,
        cgst: entry.cgst,
        hmall: entry.hmall,
        motor_rent: entry.motor_rent,
        total_amount: entry.total_amount,
        net_rate: entry.net_rate,
        selling_rate: entry.selling_rate,
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
      if (name) {
        const translatedName = await translateToMarathi(name);
        setName(translatedName);
      }
      if (stockBookNo) {
        const translatedStock = await translateToMarathi(stockBookNo);
        setStockBookNo(translatedStock);
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
      if (editingId) {
        const item = items[0];
        await updateSellingRateEntry(editingId, {
          date,
          name: name.trim(),
          particulars: item.particulars,
          qty: Number(item.qty) || 1,
          unit: item.unit || 'kg',
          pack_size: item.unit || 'kg',
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
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'विक्री दर पुस्तक नोंद अपडेट केली!' : 'Selling Rate Book entry updated successfully!'
        });
      } else {
        for (const item of items) {
          if (item.total_amount > 0) {
            await createSellingRateEntry({
              date,
              name: name.trim(),
              particulars: item.particulars,
              qty: Number(item.qty) || 1,
              unit: item.unit || 'kg',
              pack_size: item.unit || 'kg',
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
            (lang === 'mr' ? ' (ऑटो-कीटकनाशके नोंदवहीत जोडली गेली)' : ' (Auto-posted to Pesticide Register if applicable)')
        });
      }

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
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #16a34a', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dcfce7', padding: 10, borderRadius: 8, color: '#15803d' }}>
            <Tag size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              2. {lang === 'mr' ? 'बियाणे, कीटकनाशके, स्प्रेपंप व इतर विक्री दर पुस्तक' : 'Seeds, Pesticides, Spraypump and Other Selling Rate Book'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'साठा खरेदी नोंद पुस्तक · नावे नोंदवहीत स्वयंचलित नोंद (Debit Book & GL)' : 'Inward Stock Purchase Register · Auto-posts to Debit Book & GL'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              if (!window.confirm(lang === 'mr' ? 'सर्व चाचणी विक्री डेटा हटवायचा आहे का?' : 'Delete generated test sales data across all shop forms?')) return;
              setLoading(true);
              try {
                const res = await delete30DaysTestData();
                setMsg({
                  type: 'success',
                  text: (lang === 'mr' ? 'सर्व चाचणी डेटा हटवला गेला! ' : 'Successfully deleted test data! ') + res.message
                });
                loadHistory();
              } catch {
                setMsg({ type: 'error', text: lang === 'mr' ? 'चाचणी डेटा हटवताना त्रुटी आली.' : 'Error deleting test data.' });
              } finally {
                setLoading(false);
              }
            }}
          >
            {lang === 'mr' ? '🗑️ चाचणी डेटा हटवा' : '🗑️ Delete Test Data'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
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

      {editingId && (
        <div style={{ background: '#fef3c7', padding: '10px 16px', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            ✏️ Edit Mode: Updating Selling Rate Entry #{editingId}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <X size={14} /> Cancel Edit
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid-4" style={{ marginBottom: 16 }}>
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

        {/* Spacious, Consistent Multi-Item Dynamic Table Grid */}
        <div style={{ background: '#f0fdf4', padding: 18, borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#166534' }}>
              {lang === 'mr' ? 'उत्पादन दर व खर्च तक्ता (Selling Rate Grid Items)' : 'Selling Rate Grid Items'}
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ background: '#fff', color: '#15803d', borderColor: '#86efac', fontWeight: 600 }}
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
                <tr style={{ background: '#dcfce7', borderBottom: '2px solid #86efac' }}>
                  <th style={{ width: 28, padding: '6px 4px' }}>#</th>
                  <th style={{ minWidth: 150, padding: '6px 4px' }}>{lang === 'mr' ? 'तपशील (Particulars)' : 'Particulars / Item Name'}</th>
                  <th style={{ width: 60, padding: '6px 4px' }}>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th style={{ width: 95, padding: '6px 4px' }}>{lang === 'mr' ? 'एकक (Unit)' : 'Unit'}</th>
                  <th style={{ width: 85, padding: '6px 4px' }}>{lang === 'mr' ? 'मूळ रक्कम' : 'Base (₹)'}</th>
                  <th style={{ width: 70, padding: '6px 4px' }}>{lang === 'mr' ? 'एसजीएसटी' : 'SGST'}</th>
                  <th style={{ width: 70, padding: '6px 4px' }}>{lang === 'mr' ? 'सीजीएसटी' : 'CGST'}</th>
                  <th style={{ width: 70, padding: '6px 4px' }}>{lang === 'mr' ? 'हमाली' : 'HMall'}</th>
                  <th style={{ width: 80, padding: '6px 4px' }}>{lang === 'mr' ? 'मोटर भाडे' : 'Motor Rent'}</th>
                  <th style={{ width: 90, padding: '6px 4px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण' : 'Total (₹)'}</th>
                  <th style={{ width: 75, padding: '6px 4px' }}>{lang === 'mr' ? 'निव्वळ दर' : 'Net Rate'}</th>
                  <th style={{ width: 85, padding: '6px 4px' }}>{lang === 'mr' ? 'विक्री दर' : 'Selling Rate'}</th>
                  <th style={{ width: 70, padding: '6px 4px', textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={row.id} style={{ background: '#fff' }}>
                    <td style={{ padding: '6px 4px', textIndent: 4 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 4px', minWidth: 220 }}>
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
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.qty}
                        onChange={e => updateRow(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', minWidth: 95 }}>
                      <select
                        className="form-select"
                        style={{ fontSize: 12, padding: '6px 4px' }}
                        value={row.unit || 'kg'}
                        onChange={e => updateRow(idx, 'unit', e.target.value)}
                      >
                        <optgroup label={lang === 'mr' ? 'घन / वजन (Solids)' : 'Solids / Weight'}>
                          <option value="kg">kg (किलो)</option>
                          <option value="50 gm">50 gm</option>
                          <option value="100 gm">100 gm</option>
                          <option value="250 gm">250 gm</option>
                          <option value="500 gm">500 gm</option>
                          <option value="gm">gm (ग्रॅम)</option>
                          <option value="1 kg">1 kg</option>
                          <option value="5 kg">5 kg</option>
                          <option value="10 kg">10 kg</option>
                          <option value="25 kg">25 kg</option>
                          <option value="50 kg">50 kg</option>
                          <option value="Quintal">Quintal (क्विंटल)</option>
                          <option value="MT">MT (मेट्रिक टन)</option>
                        </optgroup>
                        <optgroup label={lang === 'mr' ? 'द्रव (Liquids)' : 'Liquids / Volume'}>
                          <option value="Liter">Liter (लीटर)</option>
                          <option value="50 ml">50 ml</option>
                          <option value="100 ml">100 ml</option>
                          <option value="250 ml">250 ml</option>
                          <option value="500 ml">500 ml</option>
                          <option value="ml">ml (मिली)</option>
                          <option value="1 Liter">1 Liter</option>
                          <option value="5 Liter">5 Liter</option>
                          <option value="10 Liter">10 Liter</option>
                          <option value="20 Liter">20 Liter</option>
                        </optgroup>
                        <optgroup label={lang === 'mr' ? 'इतर / पॅक (Pack / General)' : 'General / Pack'}>
                          <option value="Pkt">Pkt (पाकीट)</option>
                          <option value="Btl">Btl (बाटली)</option>
                          <option value="Can">Can (कॅन)</option>
                          <option value="Box">Box (बॉक्स)</option>
                          <option value="Bag">Bag (पोते/बॅग)</option>
                          <option value="Nos">Nos (नग/संख्या)</option>
                        </optgroup>
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.amount || ''}
                        onChange={e => updateRow(idx, 'amount', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.sgst || ''}
                        onChange={e => updateRow(idx, 'sgst', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.cgst || ''}
                        onChange={e => updateRow(idx, 'cgst', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.hmall || ''}
                        onChange={e => updateRow(idx, 'hmall', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px' }}
                        value={row.motor_rent || ''}
                        onChange={e => updateRow(idx, 'motor_rent', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: 14 }}>
                      ₹{row.total_amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ₹{row.net_rate.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, padding: '6px 8px', fontWeight: 700, color: '#2563eb' }}
                        value={row.selling_rate || ''}
                        onChange={e => updateRow(idx, 'selling_rate', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 6px', marginRight: 4, color: '#16a34a' }}
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

          <div style={{ marginTop: 14, textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#15803d' }}>
            {lang === 'mr' ? 'सर्व नोंदींची एकूण रक्कम:' : 'Grand Total Amount:'} ₹{grandTotal.toFixed(2)}
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
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#16a34a', borderColor: '#16a34a' }}>
            <Save size={16} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Entry') : (lang === 'mr' ? 'दर पुस्तक नोंदी जतन करा' : 'Save Rate Entries'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
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
      </form>

      {/* Date Range Filter Bar & Search Input Bar */}
      <div style={{ marginTop: 30, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 14, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#16a34a" />
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
              placeholder={lang === 'mr' ? 'नाव, स्टॉक क्र. किंवा तपशीलाने शोधा...' : 'Search by Name, Stock No, Particulars...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Total Summary Metrics Cards */}
        {(() => {
          const totalHistorySales = filteredHistory.reduce((acc, r) => acc + safeNum(r.total_amount || (safeNum(r.qty) * safeNum(r.selling_rate))), 0);
          const totalHistoryBase = filteredHistory.reduce((acc, r) => acc + safeNum(r.amount), 0);
          const totalHistoryMotorRent = filteredHistory.reduce((acc, r) => acc + (safeNum(r.motor_rent) + safeNum(r.hmall)), 0);

          return (
            <div className="form-grid-3" style={{ marginBottom: 16 }}>
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण विक्री रक्कम (Total Sales Amount)' : 'Total Sales Amount'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                  ₹{totalHistorySales.toFixed(2)}
                </div>
              </div>

              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण मूळ खरेदी रक्कम (Total Base Cost)' : 'Total Base Purchases'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
                  ₹{totalHistoryBase.toFixed(2)}
                </div>
              </div>

              <div style={{ background: '#fff7ed', padding: 12, borderRadius: 8, border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
                  {lang === 'mr' ? 'एकूण भाडे व हमाली आकार (Total Motor Rent)' : 'Total Rental Cash Bills'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#9a3412', marginTop: 4 }}>
                  ₹{totalHistoryMotorRent.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* History Register Table with Marathi Header Translation */}
        {filteredHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: 16 }}>
            {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही नोंदी आढळल्या नाहीत.' : 'No rate book entries found for selected date range.'}
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #86efac' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 95 }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 140 }}>{lang === 'mr' ? 'नाव' : 'Name'}</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', width: 130 }}>{lang === 'mr' ? 'तपशील' : 'Particulars'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 55 }}>{lang === 'mr' ? 'प्रमाण' : 'Qty'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 65 }}>{lang === 'mr' ? 'एकक' : 'Unit'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>{lang === 'mr' ? 'रक्कम' : 'Amount'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 70 }}>{lang === 'mr' ? 'एसजीएसटी' : 'SGST'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 70 }}>{lang === 'mr' ? 'सीजीएसटी' : 'CGST'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 70 }}>{lang === 'mr' ? 'हमाली' : 'HMall'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>{lang === 'mr' ? 'मोटर भाडे' : 'Motor Rent'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 100, color: '#16a34a' }}>{lang === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>{lang === 'mr' ? 'निव्वळ दर' : 'Net Rate'}</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', width: 90, color: '#2563eb' }}>{lang === 'mr' ? 'विक्री दर' : 'Selling Rate'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 95 }}>{lang === 'mr' ? 'स्टॉक बुक क्र.' : 'Stock Book No.'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 80 }}>{lang === 'mr' ? 'कागदपत्र' : 'Attachment'}</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', width: 120 }}>{lang === 'mr' ? 'कृती' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'left', padding: '8px 6px', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>{row.name}</td>
                    <td style={{ textAlign: 'left', padding: '8px 6px' }}>{lang === 'mr' ? getMarathiItem(row.particulars) : row.particulars}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 600 }}>{row.qty}</td>
                    <td style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600, color: '#475569' }}>{row.unit || row.pack_size || 'kg'}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.sgst).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.cgst).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.hmall).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.motor_rent).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>₹{safeNum(row.total_amount).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{safeNum(row.net_rate).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>₹{safeNum(row.selling_rate).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', padding: '8px 6px' }}>{row.stock_book_no || '-'}</td>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ marginRight: 4, padding: '4px 6px', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }} title="Edit Entry">
                        <Edit size={13} /> {lang === 'mr' ? 'संपादित' : 'Edit'}
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedRowForPrint(row)} style={{ marginRight: 4, padding: '4px 8px', background: '#2563eb', borderColor: '#2563eb' }} title="Print Entry">
                        <Printer size={13} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
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

      {/* Single Row Print Modal */}
      {selectedRowForPrint && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{ background: '#fff', width: '90%', maxWidth: 700, padding: 24, borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontWeight: 700, margin: 0 }}>Selling Rate Receipt #{selectedRowForPrint.stock_book_no || selectedRowForPrint.id}</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#2563eb', borderColor: '#2563eb' }}>
                  <Printer size={14} /> Print Receipt
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRowForPrint(null)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-rate-receipt" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                  THE BELGAUM GARDENERS CO-OP. WEAVERS & AGRICULTURAL SOCIETY LTD.
                </h3>
                <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>SELLING RATE VOUCHER RECEIPT</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Date: {selectedRowForPrint.date} | Stock Book No: {selectedRowForPrint.stock_book_no || '-'}</div>
              </div>

              <div className="form-grid-2" style={{ fontSize: 13, marginBottom: 14 }}>
                <div><strong>Customer/Farmer Name:</strong> {selectedRowForPrint.name}</div>
                <div><strong>Particulars Item:</strong> {selectedRowForPrint.particulars}</div>
                <div><strong>Pack Size:</strong> {selectedRowForPrint.pack_size || '1 Ltr / Pkt'}</div>
                <div><strong>Quantity:</strong> {selectedRowForPrint.qty}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 12, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Base Amount</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>SGST</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>CGST</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>HMall / Rent</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Total Amount</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Selling Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{safeNum(selectedRowForPrint.amount).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{safeNum(selectedRowForPrint.sgst).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{safeNum(selectedRowForPrint.cgst).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>₹{(safeNum(selectedRowForPrint.hmall) + safeNum(selectedRowForPrint.motor_rent)).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{safeNum(selectedRowForPrint.total_amount).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>₹{safeNum(selectedRowForPrint.selling_rate).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <div>Prepared By: _________________</div>
                <div>Authorized Signatory: _________________</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#16a34a', borderColor: '#16a34a' }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-rate-book" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                  BELGAUM GARDENERS CO-OP PRODUCTION SUPPLY AND SALE SOCIETY LTD.
                </h3>
                <div style={{ fontSize: 11, fontWeight: 'bold', margin: '4px 0', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>📍 Address: 930/1A Zanda Chowk Market, Belgaum 590002</span>
                  <span>📞 Phone: 0831-2400123 / 0831-2400124</span>
                  <span>🆔 GSTN: 29AAAAB1234C1Z5</span>
                </div>
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
