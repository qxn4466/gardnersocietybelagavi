import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FileText, BookMarked, Leaf, Users, TrendingUp, TrendingDown, ClipboardCheck, X, Receipt,
  Landmark, BookOpen, CreditCard, ShieldCheck, Tag, ShoppingCart, FlaskConical, BarChart3
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import type { User } from '../types';

interface SidebarProps {
  user?: User | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user: propUser, isOpen, onClose }) => {
  const { t, lang } = useTranslation();
  const location = useLocation();

  const savedUser = localStorage.getItem('user');
  const user: User | null = propUser || (savedUser ? JSON.parse(savedUser) : null);

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const societyName = lang === 'mr'
    ? <>बेळगाव गार्डनर्स<br />को-ऑप सोसायटी लि.</>
    : <>Belgaum Gardeners<br />Co-op Society Ltd.</>;

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)',
            zIndex: 99998,
          }}
        />
      )}
      <aside className={`sidebar${isOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="leaf-icon">🌿</div>
            <div className="society-name">{societyName}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="mobile-close-btn"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {/* SECTION 1: ACCOUNTANT FORMS */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8',
            padding: '10px 12px 6px', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{lang === 'mr' ? 'लेखापाल फॉर्म्स' : 'Accountant Forms'}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(148, 163, 184, 0.15)', borderRadius: 4, color: '#cbd5e1' }}>
              {lang === 'mr' ? 'मुख्य डॅशबोर्ड' : 'Main'}
            </span>
          </div>

          <NavLink
            to="/savings-accounts"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <Users size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_savings_accounts')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? '१०-अंकी ओळख व KYC कागदपत्रे' : '10-DIGIT ID & KYC DOCS'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <FileText size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? 'जमा-नावे खाते फॉर्म' : 'Credit-Debit Account Form'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर १ · डेटा प्रविष्टी' : 'LEVEL 1 · DATA ENTRY'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/creditbook"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <TrendingUp size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_credit_book')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर २ · जमा नोंदी' : 'LEVEL 2 · RECEIPTS & CREDITS'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/debitbook"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <TrendingDown size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_debit_book')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर २ · नावे नोंदी' : 'LEVEL 2 · PAYMENTS & DEBITS'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/ledger"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <BookMarked size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_general_ledger')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर ३ · वार्षिक दृश्य' : 'LEVEL 3 · YEARLY VIEW'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/audit-package"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <ClipboardCheck size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_audit_package')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'लेखापरीक्षक बाइंडर' : 'AUDITOR BINDER & SCHEDULES'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/meeting-notice"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <FileText size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? 'मिटिंग नोटीस' : 'Meeting Notice'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'मॅ. कमिटी मिटिंग नोटीस' : 'MC MEETING NOTICE'}
              </span>
            </div>
          </NavLink>

          {/* SECTION 2: CASHIER DASHBOARD & ALL ITS FORMS */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8',
            padding: '18px 12px 6px', letterSpacing: '0.05em', borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            marginTop: 4, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{lang === 'mr' ? 'कॅशियर डॅशबोर्ड' : 'Cashier Dashboard'}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: 4, color: '#38bdf8' }}>
              {lang === 'mr' ? '६ फॉर्म्स' : '6 Forms'}
            </span>
          </div>

          <NavLink
            to="/cashier?tab=payment-voucher"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && (currentTab === 'payment-voucher' || !currentTab) ? ' active' : ''}`}
          >
            <FileText size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '१. रोख पेमेंट व्हाऊचर' : '1. Cash Payment Voucher'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर १ · खर्च व्हाऊचर' : 'Level 1 · Payment Voucher'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/cashier?tab=receipt-voucher"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'receipt-voucher' ? ' active' : ''}`}
          >
            <Receipt size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '२. रोख पावती व्हाऊचर' : '2. Cash Receipt Voucher'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर १ · कॅश मेमो' : 'Level 1 · Receipt Voucher'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/cashier?tab=rent-bill"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'rent-bill' ? ' active' : ''}`}
          >
            <Landmark size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '३. भाडे बिल फॉर्म' : '3. Rent Bill Form'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर १ · टॅक्स इनव्हॉईस' : 'Level 1 · Rent Invoice'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/cashier?tab=cash-scroll"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'cash-scroll' ? ' active' : ''}`}
          >
            <BookOpen size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '४. रोख स्क्रोल पुस्तक' : '4. Cash Scroll Book'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर २ · दैनंदिन रोख नोंद' : 'Level 2 · Daily Scroll'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/cashier?tab=cheque-issue"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'cheque-issue' ? ' active' : ''}`}
          >
            <CreditCard size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '५. चेक देणे नोंद पुस्तक' : '5. Cheque Issue Book'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर २ · चेक नोंद' : 'Level 2 · Cheque Register'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/cashier?tab=audit-form"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'audit-form' ? ' active' : ''}`}
          >
            <ShieldCheck size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '६. कॅशियर लेखापरीक्षा फॉर्म' : '6. Cashier Audit Form'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'स्तर ३ · लेखापरीक्षक अहवाल' : 'Level 3 · Audit Package'}
              </span>
            </div>
          </NavLink>

          {/* SECTION 3: SHOPKEEPER DASHBOARD & FORMS */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#34d399',
            padding: '18px 12px 6px', letterSpacing: '0.05em', borderBottom: '1px solid rgba(52, 211, 153, 0.2)',
            marginTop: 4, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>{lang === 'mr' ? 'दुकानदार डॅशबोर्ड' : 'Shopkeeper Dashboard'}</span>
            <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(52, 211, 153, 0.15)', borderRadius: 4, color: '#34d399' }}>
              {lang === 'mr' ? '५ फॉर्म्स' : '5 Forms'}
            </span>
          </div>

          <NavLink
            to="/shopkeeper?tab=selling-rate"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/shopkeeper' && (currentTab === 'selling-rate' || !currentTab) ? ' active' : ''}`}
          >
            <Tag size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '१. विक्री दर पुस्तक' : '1. Selling Rate Book'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'बियाणे, कीटकनाशके दर' : 'Seeds & Pesticide Rates'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/shopkeeper?tab=tax-invoice"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/shopkeeper' && currentTab === 'tax-invoice' ? ' active' : ''}`}
          >
            <Receipt size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '२. टॅक्स इनव्हॉईस' : '2. Shop Tax Invoice'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'जीएसटी कर इनव्हॉईस' : 'GST Tax Invoice'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/shopkeeper?tab=retail-bill"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/shopkeeper' && currentTab === 'retail-bill' ? ' active' : ''}`}
          >
            <ShoppingCart size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '३. किरकोळ रोख बिल' : '3. Retail Cash Bill'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'TIN / PPO INSAT मेमो' : 'TIN / PPO INSAT Memo'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/shopkeeper?tab=pesticide-register"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/shopkeeper' && currentTab === 'pesticide-register' ? ' active' : ''}`}
          >
            <FlaskConical size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '४. कीटकनाशके विक्री नोंद' : '4. Pesticide Sale Register'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'बोरीक ॲसिड व उत्पादने' : 'Boric Acid & Products'}
              </span>
            </div>
          </NavLink>

          <NavLink
            to="/shopkeeper?tab=audit-book"
            onClick={onClose}
            className={() => `sidebar-nav-item${location.pathname === '/shopkeeper' && currentTab === 'audit-book' ? ' active' : ''}`}
          >
            <BarChart3 size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{lang === 'mr' ? '५. दुकान लेखापरीक्षा पुस्तक' : '5. Shopkeeper Audit Book'}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? 'दुकान विक्री अहवाल' : 'Shop Sales Audit'}
              </span>
            </div>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Leaf size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {lang === 'mr' ? 'बेळगाव, कर्नाटक' : 'Belgaum, Karnataka'}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
