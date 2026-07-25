import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, BookOpen, BookMarked, Leaf, Users, TrendingUp, TrendingDown, ClipboardCheck } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="leaf-icon">🌿</div>
        <div className="society-name">
          Belagavi Gardeners<br />
          Co-op Society Ltd.
        </div>
        <span className="badge">Accounting System</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/savings-accounts"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
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
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
        >
          <FileText size={18} className="nav-icon" />
          <div className="nav-label-group">
            <span>Credit-Debit Account Form</span>
            <span className="nav-level-badge">Level 1 · Data Entry</span>
          </div>
        </NavLink>

        <NavLink
          to="/creditbook"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
        >
          <TrendingUp size={18} className="nav-icon" />
          <div className="nav-label-group">
            <span>Credit Book</span>
            <span className="nav-level-badge">Level 2 · Receipts &amp; Credits</span>
          </div>
        </NavLink>

        <NavLink
          to="/debitbook"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
        >
          <TrendingDown size={18} className="nav-icon" />
          <div className="nav-label-group">
            <span>Debit Book</span>
            <span className="nav-level-badge">Level 2 · Payments &amp; Debits</span>
          </div>
        </NavLink>

        <NavLink
          to="/ledger"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
        >
          <BookMarked size={18} className="nav-icon" />
          <div className="nav-label-group">
            <span>General Ledger</span>
            <span className="nav-level-badge">Level 3 · Monthly View</span>
          </div>
        </NavLink>

        <NavLink
          to="/audit-package"
          className={({ isActive }) =>
            `sidebar-nav-item${isActive ? ' active' : ''}`
          }
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
  );
};

export default Sidebar;
