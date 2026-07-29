import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FileText, BookMarked, Leaf, Users, TrendingUp, TrendingDown, ClipboardCheck, X, Receipt, Landmark, BookOpen, CreditCard, ShieldCheck } from 'lucide-react';
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

  const isCashier = user?.role === 'CASHIER' || user?.username?.toLowerCase() === 'cashier';

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'payment-voucher';

  const societyName = lang === 'mr'
    ? <>बेळगाव गार्डनर्स<br />को-ऑप सोसायटी लि.</>
    : <>Belagavi Gardeners<br />Co-op Society Ltd.</>;

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
          {/* CASHIER MENU ITEMS (Show as primary menu when Cashier logs in) */}
          {isCashier ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '8px 12px', letterSpacing: '0.05em' }}>
                {lang === 'mr' ? 'कॅशियर कार्यप्रणाली (Cashier Suite)' : 'Cashier Operations'}
              </div>

              <NavLink
                to="/cashier?tab=payment-voucher"
                onClick={onClose}
                className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'payment-voucher' ? ' active' : ''}`}
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
            </>
          ) : (
            /* ACCOUNTANT MENU ITEMS (Matching User's Screenshot) */
            <>
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
                    {lang === 'mr' ? 'स्तर ३ · मासिक दृश्य' : 'LEVEL 3 · MONTHLY VIEW'}
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

              {/* CASHIER SECTION FOR ACCOUNTANTS */}
              <div style={{ marginTop: 16, borderTop: '1px dashed var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', padding: '0 12px 6px', letterSpacing: '0.05em' }}>
                  {lang === 'mr' ? 'कॅशियर फॉर्म्स (Cashier Forms)' : 'Cashier Forms'}
                </div>
                <NavLink
                  to="/cashier?tab=payment-voucher"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'payment-voucher' ? ' active' : ''}`}
                >
                  <FileText size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '१. पेमेंट व्हाऊचर' : '1. Payment Voucher'}</span>
                    <span className="nav-level-badge">LEVEL 1 · CASHIER</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/cashier?tab=receipt-voucher"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'receipt-voucher' ? ' active' : ''}`}
                >
                  <Receipt size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '२. पावती व्हाऊचर' : '2. Receipt Voucher'}</span>
                    <span className="nav-level-badge">LEVEL 1 · CASHIER</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/cashier?tab=rent-bill"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'rent-bill' ? ' active' : ''}`}
                >
                  <Landmark size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '३. भाडे बिल फॉर्म' : '3. Rent Bill Form'}</span>
                    <span className="nav-level-badge">LEVEL 1 · CASHIER</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/cashier?tab=cash-scroll"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'cash-scroll' ? ' active' : ''}`}
                >
                  <BookOpen size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '४. रोख स्क्रोल पुस्तक' : '4. Cash Scroll Book'}</span>
                    <span className="nav-level-badge">LEVEL 2 · CASHIER</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/cashier?tab=cheque-issue"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'cheque-issue' ? ' active' : ''}`}
                >
                  <CreditCard size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '५. चेक देणे पुस्तक' : '5. Cheque Issue Book'}</span>
                    <span className="nav-level-badge">LEVEL 2 · CASHIER</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/cashier?tab=audit-form"
                  onClick={onClose}
                  className={() => `sidebar-nav-item${location.pathname === '/cashier' && currentTab === 'audit-form' ? ' active' : ''}`}
                >
                  <ShieldCheck size={18} className="nav-icon" style={{ color: 'var(--amber-400)' }} />
                  <div className="nav-label-group">
                    <span>{lang === 'mr' ? '६. कॅशियर ऑडिट' : '6. Cashier Audit'}</span>
                    <span className="nav-level-badge">LEVEL 3 · CASHIER</span>
                  </div>
                </NavLink>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <Leaf size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {lang === 'mr' ? 'बेळगाव, कर्नाटक' : 'Belagavi, Karnataka'}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
