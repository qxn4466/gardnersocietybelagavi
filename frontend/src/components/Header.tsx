import React from 'react';
import { Calendar, User as UserIcon, LogOut, Menu } from 'lucide-react';
import PrintButton from './PrintButton';
import type { User } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  level?: 1 | 2 | 3;
  showPrint?: boolean;
  actions?: React.ReactNode;
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Level 1 · Data Entry',
  2: 'Level 2 · Daily Cash Book',
  3: 'Level 3 · General Ledger',
};

const Header: React.FC<HeaderProps> = ({
  title, subtitle, level, showPrint = false, actions, user, onLogout, onToggleMobileMenu
}) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="mobile-menu-btn"
            title="Open Navigation Menu"
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: 'var(--blue-700)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <Menu size={18} /> Menu
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="header-title">{title}</h1>
            {level && (
              <span className={`level-pill level-${level}`}>
                {LEVEL_LABELS[level]}
              </span>
            )}
          </div>
          {subtitle && <div className="header-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-date">
          <Calendar size={14} />
          {dateStr}
        </div>

        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', background: 'rgba(30,41,59,0.7)',
            border: '1px solid var(--border-subtle)', borderRadius: 20,
          }}>
            <UserIcon size={14} color="var(--blue-400)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.full_name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px',
              background: user.role === 'ACCOUNTS' ? 'rgba(59,130,246,0.2)' : 'rgba(251,191,36,0.2)',
              color: user.role === 'ACCOUNTS' ? 'var(--blue-400)' : 'var(--amber-400)',
              borderRadius: 10, textTransform: 'uppercase',
            }}>
              {user.role}
            </span>
          </div>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="btn btn-secondary btn-sm no-print"
            title="Sign out"
            style={{ padding: '6px 10px' }}
          >
            <LogOut size={14} /> Logout
          </button>
        )}

        {actions}
        {showPrint && <PrintButton />}
      </div>
    </header>
  );
};

export default Header;
