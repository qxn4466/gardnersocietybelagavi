import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, BookMarked, Leaf, Users, TrendingUp, TrendingDown, ClipboardCheck, X } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
            <div className="society-name">
              Belagavi Gardeners<br />
              Co-op Society Ltd.
            </div>
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
              <span>Savings Accounts</span>
              <span className="nav-level-badge">10-Digit ID &amp; KYC Docs</span>
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
              <span>Credit-Debit Account Form</span>
              <span className="nav-level-badge">Level 1 · Data Entry</span>
            </div>
          </NavLink>

          <NavLink
            to="/creditbook"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <TrendingUp size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>Credit Book</span>
              <span className="nav-level-badge">Level 2 · Receipts &amp; Credits</span>
            </div>
          </NavLink>

          <NavLink
            to="/debitbook"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <TrendingDown size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>Debit Book</span>
              <span className="nav-level-badge">Level 2 · Payments &amp; Debits</span>
            </div>
          </NavLink>

          <NavLink
            to="/ledger"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <BookMarked size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>General Ledger</span>
              <span className="nav-level-badge">Level 3 · Monthly View</span>
            </div>
          </NavLink>

          <NavLink
            to="/audit-package"
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <ClipboardCheck size={18} className="nav-icon" />
            <div className="nav-label-group">
              <span>Audit Package</span>
              <span className="nav-level-badge">Auditor Binder &amp; Schedules</span>
            </div>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <Leaf size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Belagavi, Karnataka
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
