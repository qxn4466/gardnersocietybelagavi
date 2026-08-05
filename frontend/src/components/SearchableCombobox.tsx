import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Plus, Edit2, Check, Search, X, Keyboard } from 'lucide-react';
import { getMarathiItem } from '../utils/translator';
import MarathiKeyboard from './MarathiKeyboard';

interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onAddNewOption?: (newOption: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  lang?: 'en' | 'mr';
  itemTranslations?: Record<string, string>;
  allowCustom?: boolean;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  onAddNewOption,
  placeholder,
  className,
  style,
  disabled = false,
  lang = 'en',
  itemTranslations = {},
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 200,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync search term with value when value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
    }
  }, [value, isOpen]);

  // Update dropdown portal position
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 220),
      });
    }
  };

  // Recalculate position on open, scroll, resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.searchable-combobox-portal')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (opt: string): string => {
    if (!opt) return '';
    if (lang === 'mr') {
      return itemTranslations[opt] || getMarathiItem(opt) || opt;
    }
    return opt;
  };

  // Filter options based on search term
  const filteredOptions = options.filter(opt => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const englishMatch = opt.toLowerCase().includes(term);
    const marathiMatch = getLabel(opt).toLowerCase().includes(term);
    return englishMatch || marathiMatch;
  });

  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearchTerm(getLabel(opt));
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const targetVal = searchTerm.trim();
    if (!targetVal) {
      const promptVal = window.prompt(
        lang === 'mr'
          ? 'नवीन बाब प्रविष्ट करा (Enter new custom item):'
          : 'Enter new custom item / product:'
      );
      if (promptVal && promptVal.trim()) {
        const newTrimmed = promptVal.trim();
        if (onAddNewOption) onAddNewOption(newTrimmed);
        onChange(newTrimmed);
        setSearchTerm(getLabel(newTrimmed));
      }
    } else {
      if (onAddNewOption) onAddNewOption(targetVal);
      onChange(targetVal);
      setSearchTerm(getLabel(targetVal));
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', minWidth: 150, ...style }}
      className={`searchable-combobox-container ${className || ''}`}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            disabled={disabled}
            style={{
              width: '100%',
              paddingRight: searchTerm ? 54 : 32,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: '#ffffff',
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            placeholder={placeholder || (lang === 'mr' ? 'शोधा किंवा निवडा...' : 'Search or select...')}
            value={searchTerm}
            onChange={e => {
              const val = e.target.value;
              setSearchTerm(val);
              if (allowCustom) onChange(val);
              if (!isOpen) setIsOpen(true);
              updatePosition();
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
                updatePosition();
              }
            }}
          />

          {/* Action icons right inside input */}
          <div
            style={{
              position: 'absolute',
              right: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  onChange('');
                  if (inputRef.current) inputRef.current.focus();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear text"
              >
                <X size={13} />
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) updatePosition();
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Marathi Keyboard Toggle Button */}
        <button
          type="button"
          className={`btn btn-sm ${showKeyboard ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 8px', height: 36 }}
          title="मराठी टायपिंग कीबोर्ड उघडा (Open Marathi Touch Keypad)"
          onClick={() => {
            setShowKeyboard(!showKeyboard);
            if (inputRef.current) inputRef.current.focus();
          }}
        >
          <Keyboard size={14} color={showKeyboard ? '#ffffff' : '#2563eb'} />
        </button>
      </div>

      {/* Floating Marathi Touch Keypad Component */}
      <MarathiKeyboard
        isOpen={showKeyboard}
        onClose={() => setShowKeyboard(false)}
        targetInputRef={inputRef}
      />

      {/* React Portal Dropdown (Renders on body to prevent table overflow clipping!) */}
      {isOpen &&
        !disabled &&
        ReactDOM.createPortal(
          <div
            className="searchable-combobox-portal"
            style={{
              position: 'absolute',
              top: dropdownCoords.top + 4,
              left: dropdownCoords.left,
              width: dropdownCoords.width,
              maxHeight: 260,
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              zIndex: 999999,
              padding: 4,
            }}
          >
            {/* Quick Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: '1px solid #f1f5f9',
                background: '#f8fafc',
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={12} />
                {lang === 'mr'
                  ? `पर्याय (${filteredOptions.length})`
                  : `Options (${filteredOptions.length})`}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} color="#94a3b8" />
              </button>
            </div>

            {/* Options List */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = opt === value || getLabel(opt) === searchTerm;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#1d4ed8' : '#0f172a',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{getLabel(opt)}</span>
                    {isSelected && <Check size={14} color="#2563eb" />}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                {lang === 'mr' ? 'पर्याय आढळला नाही' : 'No matching item'}
              </div>
            )}

            {/* ➕ Add Custom Particular / Product Option */}
            {allowCustom && (
              <div
                onClick={handleAddNew}
                style={{
                  marginTop: 4,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#f0fdf4',
                  border: '1px dashed #86efac',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f0fdf4')}
              >
                <Plus size={14} color="#16a34a" />
                <span>
                  {searchTerm.trim()
                    ? (lang === 'mr'
                        ? `➕ "+ ${searchTerm.trim()}" नवीन बाब म्हणून जोडा`
                        : `➕ Add "${searchTerm.trim()}" as New Item`)
                    : (lang === 'mr'
                        ? '➕ + नवीन बाब / उत्पादन यादीत जोडा...'
                        : '➕ + Add New Custom Item / Product...')}
                </span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableCombobox;
