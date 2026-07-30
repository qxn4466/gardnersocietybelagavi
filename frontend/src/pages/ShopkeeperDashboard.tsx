import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import SellingRateBookForm from '../components/shopkeeper/SellingRateBookForm';
import ShopTaxInvoiceForm from '../components/shopkeeper/ShopTaxInvoiceForm';
import ShopRetailBillForm from '../components/shopkeeper/ShopRetailBillForm';
import PesticideSaleRegisterForm from '../components/shopkeeper/PesticideSaleRegisterForm';
import ShopkeeperAuditForm from '../components/shopkeeper/ShopkeeperAuditForm';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { Tag, Receipt, ShoppingCart, FlaskConical, BarChart3 } from 'lucide-react';

interface ShopkeeperDashboardProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

type TabType = 'selling-rate' | 'tax-invoice' | 'retail-bill' | 'pesticide-register' | 'audit-book';

const ShopkeeperDashboard: React.FC<ShopkeeperDashboardProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['selling-rate', 'tax-invoice', 'retail-bill', 'pesticide-register', 'audit-book'].includes(tabParam)
      ? tabParam
      : 'selling-rate'
  );

  useEffect(() => {
    if (tabParam && ['selling-rate', 'tax-invoice', 'retail-bill', 'pesticide-register', 'audit-book'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="page-container">
      {/* Top Header Navigation Bar */}
      <Header
        user={user}
        title={lang === 'mr' ? 'दुकानदार डॅशबोर्ड (Shop Keeper Dashboard)' : 'Shop Keeper Dashboard'}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />


      {/* 5 Tab Navigation Buttons */}
      <div className="tab-navigation" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--border-subtle)', paddingBottom: 8, overflowX: 'auto' }}>
        <button
          className={`tab-button ${activeTab === 'selling-rate' ? 'active' : ''}`}
          onClick={() => handleTabChange('selling-rate')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'selling-rate' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'selling-rate' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <Tag size={16} /> 1. {lang === 'mr' ? 'विक्री दर पुस्तक' : 'Selling Rate Book'}
        </button>

        <button
          className={`tab-button ${activeTab === 'tax-invoice' ? 'active' : ''}`}
          onClick={() => handleTabChange('tax-invoice')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'tax-invoice' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'tax-invoice' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <Receipt size={16} /> 2. {lang === 'mr' ? 'टॅक्स इनव्हॉईस' : 'Tax Invoice'}
        </button>

        <button
          className={`tab-button ${activeTab === 'retail-bill' ? 'active' : ''}`}
          onClick={() => handleTabChange('retail-bill')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'retail-bill' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'retail-bill' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <ShoppingCart size={16} /> 3. {lang === 'mr' ? 'किरकोळ रोख बिल' : 'Retail Cash Bill'}
        </button>

        <button
          className={`tab-button ${activeTab === 'pesticide-register' ? 'active' : ''}`}
          onClick={() => handleTabChange('pesticide-register')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'pesticide-register' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'pesticide-register' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <FlaskConical size={16} /> 4. {lang === 'mr' ? 'कीटकनाशके नोंदवही' : 'Pesticide Sale Register'}
        </button>

        <button
          className={`tab-button ${activeTab === 'audit-book' ? 'active' : ''}`}
          onClick={() => handleTabChange('audit-book')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'audit-book' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'audit-book' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <BarChart3 size={16} /> 5. {lang === 'mr' ? 'दुकान लेखापरीक्षा पुस्तक' : 'Audit Book'}
        </button>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'selling-rate' && <SellingRateBookForm user={user} />}
        {activeTab === 'tax-invoice' && <ShopTaxInvoiceForm user={user} />}
        {activeTab === 'retail-bill' && <ShopRetailBillForm user={user} />}
        {activeTab === 'pesticide-register' && <PesticideSaleRegisterForm user={user} />}
        {activeTab === 'audit-book' && <ShopkeeperAuditForm user={user} />}
      </div>
    </div>
  );
};

export default ShopkeeperDashboard;
