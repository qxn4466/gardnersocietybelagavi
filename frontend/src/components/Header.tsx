import React, { useState } from 'react';
import { Calendar, User as UserIcon, LogOut, Menu, Keyboard, Languages, Loader2 } from 'lucide-react';
import PrintButton from './PrintButton';
import MarathiKeyboard from './MarathiKeyboard';
import type { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LANG_LABELS, type Lang } from '../i18n/translations';
import { translateToMarathi } from '../utils/translator';

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

const LEVEL_LABELS_MR: Record<number, string> = {
  1: 'स्तर १ · डेटा प्रविष्टी',
  2: 'स्तर २ · दैनंदिन रोख वही',
  3: 'स्तर ३ · सर्वसाधारण खातेवही',
};

const LANGS: Lang[] = ['en', 'mr'];

const Header: React.FC<HeaderProps> = ({
  title, subtitle, level, showPrint = true, actions, user, onLogout, onToggleMobileMenu
}) => {
  const { lang, setLang } = useLanguage();
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isTranslatingForm, setIsTranslatingForm] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const levelLabels = lang === 'mr' ? LEVEL_LABELS_MR : LEVEL_LABELS;

  // Single unified translation handler for all editable text fields across the open form
  const handleTranslateAllFields = async () => {
    setIsTranslatingForm(true);
    try {
      const editableElements = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input[type="text"]:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
        )
      );

      for (const el of editableElements) {
        const val = el.value.trim();
        if (val && !/[\u0900-\u097F]/.test(val)) {
          const marathiVal = await translateToMarathi(val);
          if (marathiVal && marathiVal !== val) {
            const tracker = (el as any)._valueTracker;
            if (tracker) tracker.setValue(el.value + '_diff');

            const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, marathiVal);
            else el.value = marathiVal;

            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    } catch {
      // Ignore translation errors
    } finally {
      setIsTranslatingForm(false);
    }
  };

  return (
    <header className="app-header no-print">
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
            <Menu size={18} /> {lang === 'mr' ? 'मेनू' : 'Menu'}
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="header-title">{title}</h1>
            {level && (
              <span className={`level-pill level-${level}`}>
                {levelLabels[level]}
              </span>
            )}
          </div>
          {subtitle && <div className="header-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        {/* ── Single Language Switcher, Form Translator & Keypad Trigger ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div className="lang-switcher no-print" role="group" aria-label="Language selector">
            {LANGS.map((l) => (
              <button
                key={l}
                id={`lang-btn-${l}`}
                onClick={() => setLang(l)}
                className={`lang-btn${lang === l ? ' lang-btn--active' : ''}`}
                title={l === 'en' ? 'Switch to English' : 'मराठीत स्विच करा'}
                aria-pressed={lang === l}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleTranslateAllFields}
            disabled={isTranslatingForm}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isTranslatingForm ? '#e2e8f0' : '#f0fdf4',
              color: isTranslatingForm ? '#64748b' : '#166534',
              border: '1px solid #bbf7d0',
              cursor: isTranslatingForm ? 'wait' : 'pointer',
            }}
            title="सर्व माहिती मराठीत भाषांतर करा (Translate all editable fields into Marathi)"
          >
            {isTranslatingForm ? <Loader2 size={14} className="spinner" /> : <Languages size={15} color="#166534" />}
            <span>{isTranslatingForm ? (lang === 'mr' ? 'भाषांतर होत आहे...' : 'Translating...') : (lang === 'mr' ? '🌐 मराठीत भाषांतर' : '🌐 Translate to Marathi')}</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${showKeyboard ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: showKeyboard ? '#1d4ed8' : '#eff6ff',
              color: showKeyboard ? '#ffffff' : '#1e40af',
              border: '1px solid #bfdbfe',
            }}
            title="मराठी कीबोर्ड उघडा / बंद करा (Toggle Marathi Touch Keypad)"
            onClick={() => setShowKeyboard(!showKeyboard)}
          >
            <Keyboard size={15} color={showKeyboard ? '#ffffff' : '#2563eb'} />
            <span>⌨️ {lang === 'mr' ? 'मराठी कीबोर्ड' : 'Marathi Keypad'}</span>
          </button>
        </div>

        <MarathiKeyboard
          isOpen={showKeyboard}
          onClose={() => setShowKeyboard(false)}
        />

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
            <LogOut size={14} /> {lang === 'mr' ? 'बाहेर पडा' : 'Logout'}
          </button>
        )}

        {actions}
        {showPrint && <PrintButton />}
      </div>
    </header>
  );
};

export default Header;
