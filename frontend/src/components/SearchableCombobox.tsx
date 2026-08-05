import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Edit2, Check, Search, X } from 'lucide-react';
import { getMarathiItem } from '../utils/translator';

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
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (opt: string): string => {
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
    setSearchTerm('');
    setIsOpen(false);
    setIsEditingCustom(false);
  };

  const handleCreateNew = (customVal?: string) => {
    const targetVal = (customVal || searchTerm || value).trim();
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
      }
    } else {
      if (onAddNewOption) onAddNewOption(targetVal);
      onChange(targetVal);
    }
    setSearchTerm('');
    setIsOpen(false);
    setIsEditingCustom(false);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%', minWidth: 160, ...style }}
      className={`searchable-combobox-wrapper ${className || ''}`}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            disabled={disabled}
            style={{
              width: '100%',
              paddingRight: 30,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: '#ffffff',
              cursor: disabled ? 'not-allowed' : 'text',
            }}
            placeholder={placeholder || (lang === 'mr' ? 'शोधा किंवा निवडा...' : 'Search or select...')}
            value={isOpen ? searchTerm : (isEditingCustom ? value : getLabel(value))}
            onChange={e => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
              if (allowCustom) onChange(e.target.value);
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
                setSearchTerm('');
              }
            }}
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            tabIndex={-1}
          >
            {isOpen ? <X size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Optional Edit Toggle Button */}
        {allowCustom && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ padding: '6px 8px', height: 36 }}
            title={lang === 'mr' ? 'नवीन सानुकूल नाव टाइप करा' : 'Type custom name manually'}
            onClick={() => {
              setIsEditingCustom(!isEditingCustom);
              setIsOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {/* Dropdown Options Popup */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 240,
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            padding: 4,
          }}
        >
          {/* Quick Search Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
            }}
          >
            <Search size={12} />
            <span>
              {lang === 'mr'
                ? `शोधा आणि निवडा (${filteredOptions.length} उपलब्ध)`
                : `Search & Select (${filteredOptions.length} available)`}
            </span>
          </div>

          {/* Options List */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => {
              const isSelected = opt === value;
              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--blue-700)' : 'var(--text-primary)',
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
                  {isSelected && <Check size={14} color="var(--blue-600)" />}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {lang === 'mr' ? 'कोणताही जुळणारा पर्याय सापडला नाही' : 'No matching item found'}
            </div>
          )}

          {/* ➕ Add New Custom Item Row inside Dropdown */}
          {allowCustom && (
            <div
              onClick={() => handleCreateNew()}
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
                  ? (lang === 'mr' ? `➕ "+ ${searchTerm.trim()}" नवीन जोडा` : `➕ Add "${searchTerm.trim()}" as New`)
                  : (lang === 'mr' ? '➕ + नवीन बाब / उत्पादन यादीत जोडा...' : '➕ + Add New Custom Particular / Product...')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableCombobox;
