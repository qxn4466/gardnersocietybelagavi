import React, { useState, useEffect } from 'react';
import { Package, ArrowUpRight, ArrowDownLeft, Plus, CheckCircle, AlertTriangle, Layers, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import {
  getInventoryProducts,
  addOrUpdateInventoryProduct,
  getPurchaseRecords,
  recordPurchase,
  getSalesRecords,
  recordSale,
  type InventoryProduct,
  type PurchaseRecord,
  type SalesRecord
} from '../../utils/productStore';
import { useTranslation } from '../../hooks/useTranslation';

interface InventoryManagerProps {
  user?: any;
}

const InventoryManager: React.FC<InventoryManagerProps> = () => {
  const { lang } = useTranslation();
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'purchase' | 'sales'>('products');
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);

  // Alert State
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Product Form State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPackSize, setProdPackSize] = useState('500 ml');
  const [prodSellingPrice, setProdSellingPrice] = useState('250');
  const [prodInitialStock, setProdInitialStock] = useState('20');

  // Purchase Form State
  const [purProductId, setPurProductId] = useState('');
  const [purQty, setPurQty] = useState('');
  const [purPrice, setPurPrice] = useState('');
  const [purDate, setPurDate] = useState(todayStr);

  // Sales Form State
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleDate, setSaleDate] = useState(todayStr);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const prods = getInventoryProducts();
    setProducts(prods);
    setPurchases(getPurchaseRecords());
    setSales(getSalesRecords());

    if (prods.length > 0) {
      if (!purProductId) setPurProductId(prods[0].id);
      if (!saleProductId) {
        setSaleProductId(prods[0].id);
        setSalePrice(String(prods[0].selling_price));
      }
    }
  };

  // 1. Add / Edit Product Submit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया उत्पादनाचे नाव प्रविष्ट करा.' : 'Please enter product name.' });
      return;
    }

    const price = parseFloat(prodSellingPrice) || 0;
    const stock = parseInt(prodInitialStock) || 0;

    const newProd: InventoryProduct = {
      id: editingProductId || 'p_' + Date.now(),
      name: prodName.trim(),
      pack_size: prodPackSize.trim() || '1 Ltr',
      selling_price: price,
      current_stock: stock,
    };

    addOrUpdateInventoryProduct(newProd);
    refreshData();
    setShowAddProductModal(false);
    resetProductForm();
    setMsg({
      type: 'success',
      text: lang === 'mr' ? `उत्पादन ${newProd.name} यशस्वीरित्या जतन झाले!` : `Product ${newProd.name} saved successfully!`,
    });
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPackSize('500 ml');
    setProdSellingPrice('250');
    setProdInitialStock('20');
  };

  const handleEditProduct = (p: InventoryProduct) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdPackSize(p.pack_size);
    setProdSellingPrice(String(p.selling_price));
    setProdInitialStock(String(p.current_stock));
    setShowAddProductModal(true);
  };

  // 2. Record Purchase Submit (Stock Increases Automatically)
  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(purQty) || 0;
    const price = parseFloat(purPrice) || 0;

    if (!purProductId) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया उत्पादन निवडा.' : 'Please select product.' });
      return;
    }
    if (qty <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'खरेदी संख्या ० पेक्षा जास्त असणे आवश्यक आहे.' : 'Purchase quantity must be greater than 0.' });
      return;
    }

    const res = recordPurchase(purProductId, qty, price, purDate);
    if (res.success) {
      refreshData();
      setPurQty('');
      setPurPrice('');
      setMsg({ type: 'success', text: res.message });
    } else {
      setMsg({ type: 'error', text: res.message });
    }
  };

  // 3. Record Sales Submit (Stock Decreases Automatically)
  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(saleQty) || 0;
    const price = parseFloat(salePrice) || 0;

    if (!saleProductId) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'कृपया उत्पादन निवडा.' : 'Please select product.' });
      return;
    }
    if (qty <= 0) {
      setMsg({ type: 'error', text: lang === 'mr' ? 'विक्री संख्या ० पेक्षा जास्त असणे आवश्यक आहे.' : 'Sale quantity must be greater than 0.' });
      return;
    }

    const res = recordSale(saleProductId, qty, price, saleDate);
    if (res.success) {
      refreshData();
      setSaleQty('');
      setMsg({ type: 'success', text: res.message });
    } else {
      setMsg({ type: 'error', text: res.message });
    }
  };

  // Calculations for Metrics Banner
  const totalProductsCount = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalStockValuation = products.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0);
  const lowStockCount = products.filter(p => p.current_stock <= 10).length;

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>

      {/* Top Banner & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={20} color="#2563eb" />
            {lang === 'mr' ? 'कीटकनाशक दुकानाची साठा व्यवस्थापन प्रणाली (Pesticide Store Inventory)' : 'Pesticide Store Inventory System'}
          </h3>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {lang === 'mr' ? 'सोपा प्रवाह: १. उत्पादने (Products) → २. खरेदी (Purchase +Stock) → ३. साठा (Stock) → ४. विक्री (Sales -Stock)' : 'Simple Flow: Products → Purchase (+Stock) → Live Stock → Sales (-Stock)'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { resetProductForm(); setShowAddProductModal(true); }}
          style={{
            background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
          }}
        >
          <Plus size={16} />
          {lang === 'mr' ? 'नवीन उत्पादन जोडा' : 'Add New Product'}
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {lang === 'mr' ? 'एकूण उत्पादने' : 'Total Products'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
            {totalProductsCount}
          </div>
        </div>

        <div style={{ background: '#eff6ff', padding: 14, borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
            {lang === 'mr' ? 'उपलब्ध एकूण नग (साठा)' : 'Total Stock Units'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af', marginTop: 4 }}>
            {totalStockUnits} <span style={{ fontSize: 12, fontWeight: 600 }}>{lang === 'mr' ? 'नग' : 'units'}</span>
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            {lang === 'mr' ? 'साठा मूल्य' : 'Inventory Valuation'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#166534', marginTop: 4 }}>
            ₹ {totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: lowStockCount > 0 ? '#fff7ed' : '#f8fafc', padding: 14, borderRadius: 8, border: lowStockCount > 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: lowStockCount > 0 ? '#c2410c' : '#64748b', textTransform: 'uppercase' }}>
            {lang === 'mr' ? 'कमी साठा इशारा (<१०)' : 'Low Stock Alerts'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: lowStockCount > 0 ? '#9a3412' : '#1e293b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {lowStockCount > 0 && <AlertTriangle size={18} color="#c2410c" />}
            {lowStockCount} {lang === 'mr' ? 'उत्पादने' : 'items'}
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: msg.type === 'success' ? '#15803d' : '#b91c1c',
          border: msg.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          style={{
            padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: activeSubTab === 'products' ? '#1e293b' : '#f1f5f9',
            color: activeSubTab === 'products' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Layers size={15} /> 1. {lang === 'mr' ? 'उत्पादने व साठा (Products)' : 'Products & Current Stock'}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('purchase')}
          style={{
            padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: activeSubTab === 'purchase' ? '#15803d' : '#f1f5f9',
            color: activeSubTab === 'purchase' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <ArrowDownLeft size={15} /> 2. {lang === 'mr' ? 'खरेदी (+साठा वाढतो)' : 'Purchase (Stock +)'}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sales')}
          style={{
            padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: activeSubTab === 'sales' ? '#b91c1c' : '#f1f5f9',
            color: activeSubTab === 'sales' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <ArrowUpRight size={15} /> 3. {lang === 'mr' ? 'विक्री (-साठा कमी होतो)' : 'Sales (Stock -)'}
        </button>
      </div>

      {/* ── Sub Tab 1: Products & Current Stock List ── */}
      {activeSubTab === 'products' && (
        <div>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', fontSize: 11, color: '#475569' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'mr' ? 'उत्पादनाचे नाव (Product Name)' : 'Product Name'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'mr' ? 'पॅक आझाद / आकार (Pack Size)' : 'Pack Size'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'mr' ? 'विक्री दर (Selling Price)' : 'Selling Price (₹)'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'mr' ? 'उपलब्ध साठा (Current Stock)' : 'Current Stock'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>{lang === 'mr' ? 'स्थिती' : 'Stock Status'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>{lang === 'mr' ? 'कृती' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((p, idx) => {
                    const isLow = p.current_stock <= 10;
                    const isOut = p.current_stock <= 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{p.pack_size}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                          ₹ {Number(p.selling_price).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: isOut ? '#b91c1c' : isLow ? '#c2410c' : '#1e293b' }}>
                          {p.current_stock}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: isOut ? '#fee2e2' : isLow ? '#ffedd5' : '#dcfce7',
                            color: isOut ? '#991b1b' : isLow ? '#9a3412' : '#166534',
                            border: isOut ? '1px solid #fca5a5' : isLow ? '1px solid #fed7aa' : '1px solid #86efac',
                          }}>
                            {isOut ? (lang === 'mr' ? 'निःशेष (Out of Stock)' : 'Out of Stock') : isLow ? (lang === 'mr' ? 'कमी साठा (Low Stock)' : 'Low Stock') : (lang === 'mr' ? 'उपलब्ध (In Stock)' : 'In Stock')}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleEditProduct(p)}
                            style={{
                              background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e293b',
                              borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            {lang === 'mr' ? 'संपादित करा' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                      {lang === 'mr' ? 'कोणतीही उत्पादने उपलब्ध नाहीत.' : 'No inventory products found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sub Tab 2: Purchase Form & Log (Stock Increases Automatically) ── */}
      {activeSubTab === 'purchase' && (
        <div>
          <form onSubmit={handlePurchaseSubmit} style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowDownLeft size={16} /> {lang === 'mr' ? '१. नवीन खरेदी नोंदवा (Stock increases automatically)' : 'Record Product Purchase (Stock increases automatically)'}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'उत्पादन निवडा (Product)' : 'Select Product'}</label>
                <select
                  className="form-select"
                  value={purProductId}
                  onChange={e => setPurProductId(e.target.value)}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pack_size}) — {lang === 'mr' ? `सध्याचा साठा: ${p.current_stock}` : `Current Stock: ${p.current_stock}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'खरेदी नग संख्या (Quantity Purchased)' : 'Quantity Purchased'}</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 20"
                  value={purQty}
                  onChange={e => setPurQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'खरेदी दर प्रति नग ₹ (Purchase Price)' : 'Purchase Price per Unit (₹)'}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 400.00"
                  value={purPrice}
                  onChange={e => setPurPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={purDate}
                  onChange={e => setPurDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button
                type="submit"
                style={{
                  background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(22,163,74,0.3)'
                }}
              >
                <ArrowDownLeft size={16} />
                {lang === 'mr' ? 'खरेदी जमा करा (+ साठा ऑटो वाढवा)' : 'Submit Purchase (+ Increase Stock)'}
              </button>
            </div>
          </form>

          {/* Purchase Log Table */}
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
            {lang === 'mr' ? 'खरेदी इतिहास नोंदवही (Purchase Log History)' : 'Purchase History Log'}
          </h4>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textTransform: 'uppercase', color: '#64748b' }}>
                  <th style={{ padding: '8px 10px' }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th style={{ padding: '8px 10px' }}>{lang === 'mr' ? 'उत्पादन' : 'Product'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'खरेदी नग' : 'Qty Purchased'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'खरेदी दर ₹' : 'Purchase Price ₹'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण खरेदी रक्कम ₹' : 'Total Cost ₹'}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>{rec.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{rec.product_name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>+{rec.qty_purchased}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹ {Number(rec.purchase_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>₹ {Number(rec.total_cost).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, textAlign: 'center', color: '#94a3b8' }}>
                      {lang === 'mr' ? 'कोणत्याही खरेदी नोंदी आढळल्या नाहीत.' : 'No purchase records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sub Tab 3: Sales Form & Log (Stock Decreases Automatically) ── */}
      {activeSubTab === 'sales' && (
        <div>
          <form onSubmit={handleSaleSubmit} style={{ background: '#fef2f2', padding: 16, borderRadius: 8, border: '1px solid #fca5a5', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowUpRight size={16} /> {lang === 'mr' ? '२. नवीन विक्री नोंदवा (Stock decreases automatically)' : 'Record Product Sale (Stock decreases automatically)'}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'उत्पादन निवडा (Product)' : 'Select Product'}</label>
                <select
                  className="form-select"
                  value={saleProductId}
                  onChange={e => {
                    const pid = e.target.value;
                    setSaleProductId(pid);
                    const matched = products.find(p => p.id === pid);
                    if (matched) setSalePrice(String(matched.selling_price));
                  }}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pack_size}) — {lang === 'mr' ? `उपलब्ध साठा: ${p.current_stock}` : `Stock: ${p.current_stock}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'विक्री नग संख्या (Quantity Sold)' : 'Quantity Sold'}</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 5"
                  value={saleQty}
                  onChange={e => setSaleQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'विक्री दर प्रति नग ₹ (Selling Price)' : 'Selling Price per Unit (₹)'}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 480.00"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>{lang === 'mr' ? 'दिनांक (Date)' : 'Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button
                type="submit"
                style={{
                  background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(220,38,38,0.3)'
                }}
              >
                <ArrowUpRight size={16} />
                {lang === 'mr' ? 'विक्री जमा करा (- साठा ऑटो कमी करा)' : 'Submit Sale (- Decrease Stock)'}
              </button>
            </div>
          </form>

          {/* Sales Log Table */}
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
            {lang === 'mr' ? 'विक्री इतिहास नोंदवही (Sales Log History)' : 'Sales History Log'}
          </h4>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textTransform: 'uppercase', color: '#64748b' }}>
                  <th style={{ padding: '8px 10px' }}>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                  <th style={{ padding: '8px 10px' }}>{lang === 'mr' ? 'उत्पादन' : 'Product'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'विक्री नग' : 'Qty Sold'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'विक्री दर ₹' : 'Selling Price ₹'}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'mr' ? 'एकूण विक्री रक्कम ₹' : 'Total Revenue ₹'}</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>{rec.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{rec.product_name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>-{rec.qty_sold}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹ {Number(rec.selling_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹ {Number(rec.total_revenue).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, textAlign: 'center', color: '#94a3b8' }}>
                      {lang === 'mr' ? 'कोणत्याही विक्री नोंदी आढळल्या नाहीत.' : 'No sales records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Product */}
      {showAddProductModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 450,
            padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {editingProductId ? (lang === 'mr' ? 'उत्पादन संपादित करा' : 'Edit Product') : (lang === 'mr' ? 'नवीन उत्पादन जोडा' : 'Add New Inventory Product')}
            </h4>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{lang === 'mr' ? 'उत्पादनाचे नाव (Product Name)' : 'Product Name'} *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Chlorpyrifos 20% EC"
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{lang === 'mr' ? 'पॅक आकार / प्रमाण (Pack Size)' : 'Pack Size'} *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 500 ml / 1 Ltr / 1 Kg"
                  value={prodPackSize}
                  onChange={e => setProdPackSize(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'mr' ? 'विक्री दर ₹ (Selling Price)' : 'Selling Price (₹)'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="250.00"
                    value={prodSellingPrice}
                    onChange={e => setProdSellingPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{lang === 'mr' ? 'सुरुवातीचा साठा (Initial Stock)' : 'Current/Initial Stock'} *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="20"
                    value={prodInitialStock}
                    onChange={e => setProdInitialStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {lang === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#2563eb', border: 'none', color: '#ffffff',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {lang === 'mr' ? 'जतन करा' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
