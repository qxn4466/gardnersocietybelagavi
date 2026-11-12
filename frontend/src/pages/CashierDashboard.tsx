import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import RentBillForm from '../components/cashier/RentBillForm';
import CashScrollBookForm from '../components/cashier/CashScrollBookForm';
import ChequeIssueBookForm from '../components/cashier/ChequeIssueBookForm';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { Landmark, BookOpen, CreditCard } from 'lucide-react';

interface CashierDashboardProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export type CashierTab = 'rent-bill' | 'cash-scroll' | 'cheque-issue';

const CashierDashboard: React.FC<CashierDashboardProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as CashierTab | null;
  const activeTab: CashierTab = (tabParam && ['rent-bill', 'cash-scroll', 'cheque-issue'].includes(tabParam))
    ? tabParam
    : 'rent-bill';

  const handleTabChange = (tab: CashierTab) => {
    setSearchParams({ tab });
  };

  const tabs: { id: CashierTab; label: string; icon: React.ReactNode; badge: string }[] = [
    {
      id: 'rent-bill',
      label: lang === 'mr' ? '१. भाडे बिल फॉर्म' : '1. Rent Bill Form',
      icon: <Landmark size={16} />,
      badge: lang === 'mr' ? 'टॅक्स इनव्हॉईस' : 'Tax Invoice'
    },
    {
      id: 'cash-scroll',
      label: lang === 'mr' ? '२. रोख स्क्रोल पुस्तक' : '2. Cash Scroll Book',
      icon: <BookOpen size={16} />,
      badge: lang === 'mr' ? 'स्क्रोल' : 'Scroll'
    },
    {
      id: 'cheque-issue',
      label: lang === 'mr' ? '३. चेक देणे नोंद पुस्तक' : '3. Cheque Issue Book',
      icon: <CreditCard size={16} />,
      badge: lang === 'mr' ? 'धनादेश' : 'Cheque'
    },
  ];

  return (
    <div className="page-container">
      <Header
        title={lang === 'mr' ? 'कॅशियर डॅशबोर्ड व फॉर्म्स' : 'Cashier Dashboard & Forms'}
        subtitle={lang === 'mr'
          ? 'कॅशियरसाठी भाडे बिल, स्क्रोल आणि चेक नोंद प्रणाली'
          : 'Cashier operational suite for rent, scroll and cheque records'}
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
      {activeTab === 'rent-bill' && <RentBillForm user={user} />}
      {activeTab === 'cash-scroll' && <CashScrollBookForm user={user} />}
      {activeTab === 'cheque-issue' && <ChequeIssueBookForm user={user} />}
    </div>
  );
};

export default CashierDashboard;
