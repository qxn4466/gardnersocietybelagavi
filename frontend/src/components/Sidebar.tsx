import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, BookMarked, Leaf, Users, TrendingUp, TrendingDown, ClipboardCheck, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t, lang } = useTranslation();

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
          <NavLink
            to="/savings-accounts"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <Users size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>{t('nav_savings_accounts')}</span>
              <span className="nav-level-badge">
                {lang === 'mr' ? '१०-अंकी ओळख व KYC कागदपत्रे' : '10-Digit ID & KYC Docs'}
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
                {lang === 'mr' ? 'स्तर १ · डेटा प्रविष्टी' : 'Level 1 · Data Entry'}
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
                {lang === 'mr' ? 'स्तर २ · जमा नोंदी' : 'Level 2 · Receipts & Credits'}
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
                {lang === 'mr' ? 'स्तर २ · नावे नोंदी' : 'Level 2 · Payments & Debits'}
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
                {lang === 'mr' ? 'स्तर ३ · मासिक दृश्य' : 'Level 3 · Monthly View'}
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
                {lang === 'mr' ? 'लेखापरीक्षक बाइंडर' : 'Auditor Binder & Schedules'}
              </span>
            </div>
          </NavLink>
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
