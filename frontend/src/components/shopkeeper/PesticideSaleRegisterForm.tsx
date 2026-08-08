import React, { useState, useEffect } from 'react';
import { Printer, Save, Plus, Trash2, Edit, CheckCircle2, AlertCircle, Calendar, Search, FlaskConical, Languages, Loader2 } from 'lucide-react';
import { createPesticideSale, updatePesticideSale, fetchPesticideSales, deletePesticideSale } from '../../api/client';
import type { PesticideSaleEntry, User } from '../../types';
import { PESTICIDE_PRODUCT_LIST } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { translateToMarathi, getMarathiItem } from '../../utils/translator';
import { getStoredProducts, addStoredProduct, recordSale } from '../../utils/productStore';
import SearchableCombobox from '../SearchableCombobox';

interface PesticideSaleRegisterFormProps {
  user?: User | null;
}

const PesticideSaleRegisterForm: React.FC<PesticideSaleRegisterFormProps> = ({ user }) => {
  const { lang } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [editingId, setEditingId] = useState<number | null>(null);

  const [date, setDate] = useState(today);
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState(PESTICIDE_PRODUCT_LIST[0]);
  const [batchNo, setBatchNo] = useState('');
  const [cibNo, setCibNo] = useState('');
  const [qty, setQty] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [docPath, setDocPath] = useState('');

  // Dynamically manageable products list
  const [productList, setProductList] = useState<string[]>(getStoredProducts());

  const handleAddNewProduct = () => {
    const newProd = window.prompt(
      lang === 'mr'
        ? 'नवीन उत्पादनाचे नाव प्रविष्ट करा (उदा. Tata Fungicide, Urea 50kg):'
        : 'Enter new product name (e.g. Tata Fungicide, Urea 50kg):'
    );
    if (newProd && newProd.trim()) {
      const updatedList = addStoredProduct(newProd.trim());
      setProductList(updatedList);
      setProductName(newProd.trim());
    }
  };

  // Filter & Search states
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [history, setHistory] = useState<PesticideSaleEntry[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  useEffect(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    setAmount(q * r);
  }, [qty, rate]);

  const loadHistory = async () => {
    try {
      const data = await fetchPesticideSales(startDate, endDate);
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setDate(today);
    setCustomerName('');
    setProductName('Boric Acid');
    setQty('1');
    setRate('');
    setBatchNo('');
    setRemarks('');
    setDocPath('');
    setMsg(null);
  };

  const handleEdit = (entry: PesticideSaleEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setCustomerName(entry.customer_name);
    setProductName(entry.product_name);
    setQty(entry.qty.toString());
    setRate(entry.rate.toString());
    setBatchNo(entry.batch_no || '');
    setRemarks(entry.remarks || '');
    setDocPath(entry.doc_path || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const payload = {
        date,
        customer_name: customerName.trim(),
        product_name: productName,
        qty: parseFloat(qty) || 1,
        rate: parseFloat(rate) || 0,
        amount,
        batch_no: batchNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        doc_path: docPath || undefined,
        created_by: user?.username || 'shopkeeper',
      };

      if (editingId) {
        await updatePesticideSale(editingId, payload);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'कीटकनाशक विक्री नोंद अपडेट झाली!' : 'Pesticide sale entry updated successfully!'
        });
      } else {
        await createPesticideSale(payload);
        recordSale(productName, Number(qty) || 1, Number(rate) || 0, date);
        setMsg({
          type: 'success',
          text: lang === 'mr' ? 'कीटकनाशक नोंदणी पुस्तक नोंद जतन झाली!' : 'Pesticide sale register entry saved successfully!'
        });
      }
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

  const filteredHistory = history.filter(row =>
    (!row.remarks || !row.remarks.includes('Selling Rate Book')) &&
    (row.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.batch_no && row.batch_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (row.remarks && row.remarks.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Key pesticide products for the actual Product-Wise Grid Table columns
  const mainPesticides = [
    'Boric Acid',
    'Chlorpyrifos 20% EC',
    'Monocrotophos 36% SL',
    'Mancozeb 75% WP',
    'Neem Oil 10000 PPM',
    'Malathion 50% EC',
    'Copper Oxychloride 50% WP',
    'Carbendazim 50% WP'
  ];

  const grandTotalAmount = filteredHistory.reduce((s, h) => s + Number(h.amount || 0), 0);

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30, borderTop: '4px solid #7c3aed', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#f3e8ff', padding: 10, borderRadius: 8, color: '#6b21a8' }}>
            <FlaskConical size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              5. {lang === 'mr' ? 'कीटकनाशके विक्री नोंदवही (Pesticide Sale Register)' : 'Pesticide Sale Register'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {lang === 'mr' ? 'ऑटो-कीटकनाशके तक्ता · टॅक्स इनव्हॉईस व किरकोळ रोख बिलांमधून नोंद' : 'Auto-populated from Shop Tax Invoices & Retail Cash Bills'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
            <Printer size={14} /> {lang === 'mr' ? 'महिना / कालावधी रजिस्टर प्रिंट करा' : 'Print Month / Range Register'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            <Plus size={14} /> {lang === 'mr' ? 'नवीन हस्ते नोंद' : 'New Sale Entry'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'info' ? 'alert-info' : msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'info' ? <Loader2 size={16} className="spinner" /> : msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, background: '#faf5ff', padding: 18, borderRadius: 8, border: '1px solid #e9d5ff' }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#6b21a8' }}>
          {lang === 'mr' ? 'हस्ते कीटकनाशक नोंद जोडा (Manual Entry)' : 'Add Manual Pesticide Sale Entry'}
        </h4>
        <div className="form-grid-3" style={{ marginBottom: 14 }}>
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
            <SearchableCombobox
              value={productName}
              onChange={val => setProductName(val)}
              options={productList}
              onAddNewOption={newProd => {
                const updatedList = addStoredProduct(newProd);
                setProductList(updatedList);
              }}
              lang={lang}
            />
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
              style={{ fontWeight: 700, color: '#6b21a8', background: '#f3e8ff' }}
              value={amount.toFixed(2)}
              readOnly
            />
          </div>
          <div className="form-group">
            <label className="form-label">Batch No / Ref</label>
            <input type="text" className="form-input" placeholder="e.g. B-902" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
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
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
            <Save size={14} /> {loading ? (lang === 'mr' ? 'जतन होत आहे...' : 'Saving...') : (editingId ? (lang === 'mr' ? 'अपडेट करा' : 'Update Entry') : (lang === 'mr' ? 'नोंद जतन करा' : 'Save Pesticide Sale'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ background: '#f3e8ff', color: '#6b21a8', borderColor: '#d8b4fe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              setTranslating(true);
              setMsg({
                type: 'info',
                text: lang === 'mr' ? '⏳ मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : '⏳ Translating text to Marathi, please wait...'
              });
              try {
                if (customerName) {
                  const translatedName = await translateToMarathi(customerName);
                  setCustomerName(translatedName);
                }
                if (productName) {
                  const translatedProd = await translateToMarathi(productName);
                  setProductName(translatedProd);
                }
                if (remarks) {
                  const translatedRem = await translateToMarathi(remarks);
                  setRemarks(translatedRem);
                }
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
            }}
            disabled={translating || loading}
          >
            {translating ? (
              <>
                <Loader2 size={14} className="spinner" />
                {lang === 'mr' ? 'मराठीत भाषांतर करत आहे, कृपया वाट पहा...' : 'Translating to Marathi, please wait...'}
              </>
            ) : (
              <>
                <Languages size={14} /> {lang === 'mr' ? 'मराठीत भाषांतर करा (Translate to Marathi)' : 'Translate to Marathi'}
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>
            {lang === 'mr' ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </form>

      {/* Date Range Filter Bar & Search Input Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#7c3aed" />
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
              placeholder={lang === 'mr' ? 'ग्राहक, कीटकनाशक किंवा बॅच क्र. शोधा...' : 'Search Customer, Product, Batch...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ITEM-WISE COLUMN MATRIX REGISTER TABLE (Item Column-Wise Display with Row & Column Totals) */}
      {(() => {
          // Dynamic Pesticide Product Columns
          const itemColumns = Array.from(new Set([
            ...filteredHistory.map(h => h.product_name),
            'Boric Acid',
            'Chlorpyrifos 20% EC',
            'Monocrotophos 36% SL',
            'Mancozeb 75% WP',
            'Neem Oil 10000 PPM',
            'Buprofezin 25% SC'
          ])).filter(Boolean);

          return (
            <div style={{ background: '#fff', border: '1px solid #d8b4fe', borderRadius: 8, overflow: 'hidden', marginBottom: 24, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.05)' }}>
              <div style={{ background: '#7c3aed', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📊 {lang === 'mr' ? 'कीटकनाशके वस्तू-निहाय स्तंभ नोंदवही (Item Column-Wise Register)' : 'Pesticides Item Column-Wise Register Matrix'}</span>
                <span style={{ fontSize: 11, background: '#6b21a8', padding: '2px 8px', borderRadius: 12 }}>{itemColumns.length} Products</span>
              </div>

              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3e8ff', borderBottom: '2px solid #d8b4fe' }}>
                      <th style={{ padding: '8px 6px', border: '1px solid #e9d5ff', textAlign: 'left', minWidth: 90 }}>Date</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #e9d5ff', textAlign: 'left', minWidth: 140 }}>Customer / Ref</th>
                      {itemColumns.map(col => (
                        <th key={col} style={{ padding: '8px 6px', border: '1px solid #e9d5ff', textAlign: 'center', minWidth: 140, color: '#6b21a8' }}>
                          <div>{col}</div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>Qty @ Rate = Total ₹</div>
                        </th>
                      ))}
                      <th style={{ padding: '8px 6px', border: '1px solid #e9d5ff', textAlign: 'right', minWidth: 110, color: '#7c3aed' }}>Row Total (₹)</th>
                      <th style={{ padding: '8px 6px', border: '1px solid #e9d5ff', textAlign: 'center', minWidth: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={itemColumns.length + 4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही कीटकनाशक नोंदी नाहीत.' : 'No pesticide sales found for selected date range.'}
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(row => {
                        const rowAmt = Number(row.amount || 0);

                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f3e8ff' }}>
                            <td style={{ padding: '6px 8px', border: '1px solid #f3e8ff', whiteSpace: 'nowrap', fontSize: 11 }}>{row.date}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #f3e8ff', fontWeight: 600 }}>{row.customer_name}</td>
                            {itemColumns.map(col => {
                              const matches = row.product_name.toLowerCase().trim() === col.toLowerCase().trim() ||
                                row.product_name.toLowerCase().includes(col.toLowerCase().split(' ')[0]);

                              return (
                                <td key={col} style={{ padding: '6px 8px', border: '1px solid #f3e8ff', textAlign: 'center', background: matches ? '#faf5ff' : 'transparent' }}>
                                  {matches ? (
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{row.qty} @ ₹{Number(row.rate || 0).toFixed(2)}</div>
                                      <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: 11 }}>= ₹{rowAmt.toFixed(2)}</div>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#cbd5e1' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: '6px 8px', border: '1px solid #f3e8ff', textAlign: 'right', fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace', fontSize: 13 }}>
                              ₹{rowAmt.toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 8px', border: '1px solid #f3e8ff', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)} style={{ padding: '2px 4px', marginRight: 2, background: '#fef3c7', color: '#92400e' }} title="Edit">
                                <Edit size={12} />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)} style={{ padding: '2px 4px' }} title="Delete">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredHistory.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#f3e8ff', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: 8, border: '1px solid #d8b4fe', textAlign: 'right', color: '#6b21a8' }}>
                          COLUMN GRAND TOTALS:
                        </td>
                        {itemColumns.map(col => {
                          const colMatching = filteredHistory.filter(h =>
                            h.product_name.toLowerCase().trim() === col.toLowerCase().trim() ||
                            h.product_name.toLowerCase().includes(col.toLowerCase().split(' ')[0])
                          );
                          const totalQ = colMatching.reduce((s, h) => s + Number(h.qty || 0), 0);
                          const totalA = colMatching.reduce((s, h) => s + Number(h.amount || 0), 0);

                          return (
                            <td key={col} style={{ padding: 8, border: '1px solid #d8b4fe', textAlign: 'center', background: '#e9d5ff' }}>
                              <div style={{ fontSize: 11, color: '#1e293b' }}>Qty: {totalQ}</div>
                              <div style={{ fontSize: 12, color: '#6b21a8', fontWeight: 800 }}>₹{totalA.toFixed(2)}</div>
                            </td>
                          );
                        })}
                        <td style={{ padding: 8, border: '1px solid #d8b4fe', textAlign: 'right', color: '#6b21a8', fontSize: 14, fontFamily: 'monospace' }}>
                          ₹{grandTotalAmount.toFixed(2)}
                        </td>
                        <td style={{ padding: 8, border: '1px solid #d8b4fe' }}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })()}

      {/* History Detailed Register Table */}
      {/* Total Summary Metrics Cards */}
      {(() => {
        const safeNum = (val: any): number => {
          const n = parseFloat(String(val));
          return isNaN(n) ? 0 : n;
        };
        const totalPesticideSales = filteredHistory.reduce((acc, r) => acc + safeNum(r.amount), 0);
        const totalPesticideCount = filteredHistory.length;

        return (
          <div className="form-grid-3" style={{ marginBottom: 16 }}>
            <div style={{ background: '#faf5ff', padding: 12, borderRadius: 8, border: '1px solid #e9d5ff' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                {lang === 'mr' ? 'एकूण कीटकनाशक विक्री रक्कम (Total Pesticide Register Sales)' : 'Total Pesticide Register Sales'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>
                ₹{totalPesticideSales.toFixed(2)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {lang === 'mr' ? 'एकूण नोंदवही संख्या (Total Register Entries)' : 'Total Register Entries Count'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                {totalPesticideCount} {lang === 'mr' ? 'नोंदी' : 'Entries'}
              </div>
            </div>
          </div>
        );
      })()}

      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
        {lang === 'mr' ? 'दैनंदिन हस्ते व ऑटो नोंदवही (Detailed Transactions Log)' : 'Detailed Transactions Log'}
      </h4>
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#faf5ff', borderBottom: '2px solid #d8b4fe' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px', width: 95 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', width: 140 }}>Customer Name</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', width: 150 }}>Product Name</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 85 }}>Pack Size</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', width: 130 }}>Batch / Source Ref</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 55 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 80 }}>Rate (₹)</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 100, color: '#7c3aed' }}>Amount (₹)</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 75 }}>Doc</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'mr' ? 'निवडलेल्या कालावधीसाठी कोणत्याही कीटकनाशक नोंदी नाहीत.' : 'No pesticide sales found for selected date range.'}
                </td>
              </tr>
            ) : (
              filteredHistory.map(row => {
                const safeNum = (val: any): number => {
                  const n = parseFloat(String(val));
                  return isNaN(n) ? 0 : n;
                };
                const amt = safeNum(row.amount);
                const rate = safeNum(row.rate);
                const qty = safeNum(row.qty);

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'left', padding: '8px 6px', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>{row.customer_name}</td>
                    <td style={{ textAlign: 'left', padding: '8px 6px' }}>
                      <span className={`badge ${row.product_name.toLowerCase().includes('boric acid') ? 'badge-primary' : 'badge-secondary'}`}>
                        {row.product_name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600, color: '#475569' }}>{row.pack_size || '1 Ltr / Pkt'}</td>
                    <td style={{ textAlign: 'left', padding: '8px 6px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.batch_no || row.remarks || '-'}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 600 }}>{qty}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace' }}>₹{rate.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>₹{amt.toFixed(2)}</td>
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
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setShowPrintModal(true);
                      }} style={{ marginRight: 4, padding: '4px 8px', background: '#7c3aed', borderColor: '#7c3aed' }} title="Print Entry">
                        <Printer size={13} /> {lang === 'mr' ? 'प्रिंट' : 'Print'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredHistory.length > 0 && (
            <tfoot>
              <tr style={{ background: '#faf5ff', fontWeight: 700 }}>
                <td colSpan={6} style={{ textAlign: 'right' }}>Grand Total Pesticide Sales:</td>
                <td style={{ textAlign: 'right', color: '#7c3aed', fontSize: 14 }}>₹{grandTotalAmount.toFixed(2)}</td>
                <td colSpan={2}></td>
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
              <h4 style={{ fontWeight: 700 }}>Pesticide Sale Register Print ({startDate} to {endDate})</h4>
              <div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ marginRight: 8, background: '#7c3aed', borderColor: '#7c3aed' }}>
                  <Printer size={14} /> Print
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="printable-pesticide-register" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
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
                  PESTICIDE SALE REGISTER
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Period: {startDate} to {endDate}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Customer Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Product Name</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Batch / Source Ref</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: 6 }}>Rate (₹)</th>
                    <th style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 12 }}>No entries found</td></tr>
                  ) : (
                    filteredHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.date}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.customer_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6, fontWeight: 'bold' }}>{row.product_name}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.batch_no || row.remarks || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>{row.qty}</td>
                        <td style={{ border: '1px solid #000', padding: 6 }}>₹{Number(row.rate).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right', fontWeight: 'bold' }}>₹{Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>TOTAL PESTICIDE SALES:</td>
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
