import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import InventoryManager from '../components/shopkeeper/InventoryManager';
import SellingRateBookForm from '../components/shopkeeper/SellingRateBookForm';
import ShopTaxInvoiceForm from '../components/shopkeeper/ShopTaxInvoiceForm';
import ShopRetailBillForm from '../components/shopkeeper/ShopRetailBillForm';
import PesticideSaleRegisterForm from '../components/shopkeeper/PesticideSaleRegisterForm';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { Package, Tag, Receipt, ShoppingCart, FlaskConical } from 'lucide-react';

interface ShopkeeperDashboardProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

type TabType = 'inventory' | 'selling-rate' | 'tax-invoice' | 'retail-bill' | 'pesticide-register';

const ShopkeeperDashboard: React.FC<ShopkeeperDashboardProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = (tabParam && ['inventory', 'selling-rate', 'tax-invoice', 'retail-bill', 'pesticide-register'].includes(tabParam))
    ? tabParam
    : 'inventory';

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  return (
    <div className="page-container">
      {/* Top Header Navigation Bar */}
      <Header
        user={user}
        title={lang === 'mr' ? 'दुकानदार डॅशबोर्ड व साठा व्यवस्थापन (Shop Keeper Inventory Dashboard)' : 'Shop Keeper & Inventory Dashboard'}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* 5 Tab Navigation Buttons */}
      <div className="tab-navigation" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--border-subtle)', paddingBottom: 8, overflowX: 'auto' }}>
        <button
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => handleTabChange('inventory')}
          style={{
            padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
            background: activeTab === 'inventory' ? 'var(--blue-600)' : '#f1f5f9',
            color: activeTab === 'inventory' ? '#fff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'inventory' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
          }}
        >
          <Package size={16} /> 1. {lang === 'mr' ? 'साठा व्यवस्थापन (Inventory System)' : 'Inventory System (Products → Purchase → Stock → Sales)'}
        </button>

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
          <Tag size={16} /> 2. {lang === 'mr' ? 'विक्री दर पुस्तक' : 'Selling Rate Book'}
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
          <Receipt size={16} /> 3. {lang === 'mr' ? 'टॅक्स इनव्हॉईस' : 'Tax Invoice'}
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
          <ShoppingCart size={16} /> 4. {lang === 'mr' ? 'किरकोळ रोख बिल' : 'Retail Cash Bill'}
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
          <FlaskConical size={16} /> 5. {lang === 'mr' ? 'कीटकनाशके नोंदवही' : 'Pesticide Sale Register'}
        </button>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'inventory' && <InventoryManager user={user} />}
        {activeTab === 'selling-rate' && <SellingRateBookForm user={user} />}
        {activeTab === 'tax-invoice' && <ShopTaxInvoiceForm user={user} />}
        {activeTab === 'retail-bill' && <ShopRetailBillForm user={user} />}
        {activeTab === 'pesticide-register' && <PesticideSaleRegisterForm user={user} />}
      </div>
    </div>
  );
};

export default ShopkeeperDashboard;
