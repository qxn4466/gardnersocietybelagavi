import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PaymentVoucherForm from '../components/cashier/PaymentVoucherForm';
import ReceiptVoucherForm from '../components/cashier/ReceiptVoucherForm';
import RentBillForm from '../components/cashier/RentBillForm';
import CashScrollBookForm from '../components/cashier/CashScrollBookForm';
import ChequeIssueBookForm from '../components/cashier/ChequeIssueBookForm';
import CashierAuditForm from '../components/cashier/CashierAuditForm';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { FileText, Receipt, Landmark, BookOpen, CreditCard, ShieldCheck } from 'lucide-react';

interface CashierDashboardProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export type CashierTab = 'payment-voucher' | 'receipt-voucher' | 'rent-bill' | 'cash-scroll' | 'cheque-issue' | 'audit-form';

const CashierDashboard: React.FC<CashierDashboardProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as CashierTab | null;
  const [activeTab, setActiveTab] = useState<CashierTab>(tabParam || 'payment-voucher');

  // Sync activeTab whenever URL query parameter ?tab= changes!
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: CashierTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs: { id: CashierTab; label: string; icon: React.ReactNode; badge: string }[] = [
    {
      id: 'payment-voucher',
      label: lang === 'mr' ? '१. रोख पेमेंट व्हाऊचर' : '1. Cash Payment Voucher',
      icon: <FileText size={16} />,
      badge: lang === 'mr' ? 'पेमेंट' : 'Payment'
    },
    {
      id: 'receipt-voucher',
      label: lang === 'mr' ? '२. रोख पावती व्हाऊचर' : '2. Cash Receipt Voucher',
      icon: <Receipt size={16} />,
      badge: lang === 'mr' ? 'पावती' : 'Receipt'
    },
    {
      id: 'rent-bill',
      label: lang === 'mr' ? '३. भाडे बिल फॉर्म' : '3. Rent Bill Form',
      icon: <Landmark size={16} />,
      badge: lang === 'mr' ? 'टॅक्स इनव्हॉईस' : 'Tax Invoice'
    },
    {
      id: 'cash-scroll',
      label: lang === 'mr' ? '४. रोख स्क्रोल पुस्तक' : '4. Cash Scroll Book',
      icon: <BookOpen size={16} />,
      badge: lang === 'mr' ? 'स्क्रोल' : 'Scroll'
    },
    {
      id: 'cheque-issue',
      label: lang === 'mr' ? '५. चेक देणे नोंद पुस्तक' : '5. Cheque Issue Book',
      icon: <CreditCard size={16} />,
      badge: lang === 'mr' ? 'धनादेश' : 'Cheque'
    },
    {
      id: 'audit-form',
      label: lang === 'mr' ? '६. कॅशियर लेखापरीक्षा फॉर्म' : '6. Cashier Audit Form',
      icon: <ShieldCheck size={16} />,
      badge: lang === 'mr' ? 'ऑडिट' : 'Audit'
    },
  ];

  return (
    <div className="page-container">
      <Header
        title={lang === 'mr' ? 'कॅशियर डॅशबोर्ड व फॉर्म्स' : 'Cashier Dashboard & Forms'}
        subtitle={lang === 'mr'
          ? 'कॅशियरसाठी सर्व ६ आवश्यक फॉर्म व अहवाल प्रणाली (रोख पेमेंट, पावती, भाडे बिल, स्क्रोल, चेक, ऑडिट)'
          : 'Cashier operational suite for 6 essential forms & audit binder'}
        level={2}
        user={user}
        onLogout={onLogout}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Tab Bar Navigation */}
      <div className="no-print" style={{
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 24,
        borderBottom: '2px solid var(--border-subtle)'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-button ${isActive ? 'active' : ''}`}
              style={{
                padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: isActive ? 700 : 500, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
                background: isActive ? 'var(--blue-600)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
              <span className="badge" style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--slate-200)',
                color: isActive ? '#fff' : 'var(--text-secondary)'
              }}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render selected form component strictly based on activeTab */}
      {activeTab === 'payment-voucher' && <PaymentVoucherForm user={user} />}
      {activeTab === 'receipt-voucher' && <ReceiptVoucherForm user={user} />}
      {activeTab === 'rent-bill' && <RentBillForm user={user} />}
      {activeTab === 'cash-scroll' && <CashScrollBookForm user={user} />}
      {activeTab === 'cheque-issue' && <ChequeIssueBookForm user={user} />}
      {activeTab === 'audit-form' && <CashierAuditForm user={user} />}
    </div>
  );
};

export default CashierDashboard;
