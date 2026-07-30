import React, { useState, useEffect } from 'react';
import { Printer, Calendar, ShieldCheck, Tag, Receipt, ShoppingCart, FlaskConical, TrendingUp } from 'lucide-react';
import { fetchShopkeeperAuditSummary } from '../../api/client';
import type { ShopkeeperAuditSummary, User } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface ShopkeeperAuditFormProps {
  user?: User | null;
}

const ShopkeeperAuditForm: React.FC<ShopkeeperAuditFormProps> = ({ user }) => {
  const { lang } = useTranslation();

  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [summary, setSummary] = useState<ShopkeeperAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAuditSummary();
  }, [startDate, endDate]);

  const loadAuditSummary = async () => {
    setLoading(true);
    try {
      const data = await fetchShopkeeperAuditSummary(startDate, endDate);
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            5. {lang === 'mr' ? 'दुकानदार लेखापरीक्षा पुस्तक (Shopkeeper Audit Book)' : 'Shopkeeper Audit Book'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {lang === 'mr' ? 'दुकान विक्री, दर पुस्तक, टॅक्स इनव्हॉईस व कीटकनाशके विक्रीचा लेखापरीक्षा अहवाल' : 'Audit Package for Shop Sales, Invoices, Retail Bills & Pesticide Register'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> {lang === 'mr' ? 'लेखापरीक्षा अहवाल मुद्रित करा' : 'Print Audit Binder'}
        </button>
      </div>

      {/* Date Range Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="var(--blue-600)" />
          <label style={{ fontSize: 13, fontWeight: 600 }}>{lang === 'mr' ? 'कालावधी निवडा:' : 'Audit Period:'}</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lang === 'mr' ? 'ते' : 'to'}</span>
          <input type="date" className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {loading && <span className="spinner" />}
      </div>

      {summary && (
        <>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>1. Selling Rate Book</span>
                <Tag size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>₹{Number(summary.total_selling_rate_amount).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{summary.total_selling_rate_entries_count} Entries Recorded</div>
            </div>

            <div style={{ background: '#eff6ff', padding: 16, borderRadius: 8, border: '1px solid #93c5fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>2. Shop Tax Invoices</span>
                <Receipt size={16} color="#2563eb" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>₹{Number(summary.total_tax_invoice_amount).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{summary.total_tax_invoices_count} Invoices Issued</div>
            </div>

            <div style={{ background: '#fff7ed', padding: 16, borderRadius: 8, border: '1px solid #fdba74' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9a3412' }}>3. Retail Cash Bills</span>
                <ShoppingCart size={16} color="#ea580c" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c' }}>₹{Number(summary.total_retail_bill_amount).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{summary.total_retail_bills_count} Bills Issued</div>
            </div>

            <div style={{ background: '#faf5ff', padding: 16, borderRadius: 8, border: '1px solid #d8b4fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b21a8' }}>4. Pesticide Sales</span>
                <FlaskConical size={16} color="#9333ea" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#9333ea' }}>₹{Number(summary.total_pesticide_sale_amount).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{summary.total_pesticide_sales_count} Sales Logged</div>
            </div>
          </div>

          {/* Total Sales Volume Hero Banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', padding: 24, borderRadius: 10, marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                {lang === 'mr' ? 'एकूण दुकान विक्री उलाढाल (Grand Shop Sales Total)' : 'Grand Shop Sales Total Volume'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: '#4ade80' }}>
                ₹{Number(summary.grand_shop_sales_total).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                Period: {summary.start_date} to {summary.end_date}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
              <TrendingUp size={36} color="#4ade80" />
            </div>
          </div>
        </>
      )}

      {/* Printable Auditor Binder Section */}
      <div className="printable-shop-audit" style={{ border: '2px solid #000', padding: 24, fontFamily: 'serif', background: '#fff', color: '#000' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>
            THE BELGAUM GARDENERS CO-OPERATIVE PRODUCTION SUPPLY AND SALE SOCIETY LTD., BELGAUM
          </h3>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 6, textDecoration: 'underline' }}>
            SHOPKEEPER AUDIT BINDER & SALES REPORT
          </div>
          <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
            Audit Period: {startDate} to {endDate}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ border: '1px solid #000', padding: 8, textAlign: 'left' }}>Shop Module / Register</th>
              <th style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>Total Entries / Count</th>
              <th style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>Total Sales Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: 8 }}>1. Seeds, Pesticides & Spraypump Selling Rate Book</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{summary?.total_selling_rate_entries_count || 0}</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(summary?.total_selling_rate_amount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: 8 }}>2. Shop Tax Invoices (GST 3808)</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{summary?.total_tax_invoices_count || 0}</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(summary?.total_tax_invoice_amount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: 8 }}>3. Retail Cash Bills (TIN 29540268502 / PPO INSAT)</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{summary?.total_retail_bills_count || 0}</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(summary?.total_retail_bill_amount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: 8 }}>4. Pesticide Sale Register (Boric Acid & Products)</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{summary?.total_pesticide_sales_count || 0}</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>₹{Number(summary?.total_pesticide_sale_amount || 0).toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right' }}>GRAND TOTAL SHOP SALES VOLUME:</td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>
                {(summary?.total_selling_rate_entries_count || 0) + (summary?.total_tax_invoices_count || 0) + (summary?.total_retail_bills_count || 0) + (summary?.total_pesticide_sales_count || 0)}
              </td>
              <td style={{ border: '1px solid #000', padding: 8, textAlign: 'right', fontSize: 14 }}>₹{Number(summary?.grand_shop_sales_total || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 40 }}>
          <div>Shop Keeper Signature<br /><br />_______________</div>
          <div>Internal Auditor Signature<br /><br />_______________</div>
          <div>Co-Op Manager Signature<br /><br />_______________</div>
        </div>
      </div>
    </div>
  );
};

export default ShopkeeperAuditForm;
