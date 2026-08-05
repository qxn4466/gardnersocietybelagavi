import React, { useState, useEffect } from 'react';
import { Keyboard, X, Delete, CornerDownLeft, Sparkles, Move } from 'lucide-react';

interface MarathiKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertChar?: (char: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

// Full Devanagari / Marathi Character Sets
const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः', 'ॲ', 'ॉ'];

const MATRAS = ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ॅ', 'ॉ', '्'];

const CONSONANTS = [
  ['क', 'ख', 'ग', 'घ', 'ङ'],
  ['च', 'छ', 'ज', 'झ', 'ञ'],
  ['ट', 'ठ', 'ड', 'ढ', 'ण'],
  ['त', 'थ', 'द', 'ध', 'न'],
  ['प', 'फ', 'ब', 'भ', 'म'],
  ['य', 'र', 'ल', 'व', 'श'],
  ['ष', 'स', 'ह', 'ळ', 'क्ष', 'ज्ञा']
];

const NUMBERS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९', '₹', '।', '॥'];

export const MarathiKeyboard: React.FC<MarathiKeyboardProps> = ({
  isOpen,
  onClose,
  onInsertChar,
  onBackspace,
  onClear,
  targetInputRef,
}) => {
  const [activeTab, setActiveTab] = useState<'vowels' | 'consonants' | 'numbers'>('consonants');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focus and insert text into target input
  const insertCharacter = (char: string) => {
    if (onInsertChar) {
      onInsertChar(char);
    }

    const input = targetInputRef?.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);
    if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const value = input.value;
      const newValue = value.substring(0, start) + char + value.substring(end);

      // Native setter for React state binding
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue);
      } else {
        input.value = newValue;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Set cursor position after inserted character
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + char.length, start + char.length);
      }, 0);
    }
  };

  const handleBackspace = () => {
    if (onBackspace) {
      onBackspace();
    }
    const input = targetInputRef?.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);
    if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const value = input.value;

      if (start === end && start > 0) {
        const newValue = value.substring(0, start - 1) + value.substring(end);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(input, newValue);
        else input.value = newValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start - 1, start - 1);
        }, 0);
      } else if (start !== end) {
        const newValue = value.substring(0, start) + value.substring(end);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(input, newValue);
        else input.value = newValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start, start);
        }, 0);
      }
    }
  };

  const handleClear = () => {
    if (onClear) onClear();
    const input = targetInputRef?.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);
    if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) nativeSetter.call(input, '');
      else input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(10, Math.min(window.innerWidth - 450, e.clientX - dragOffset.x)),
          y: Math.max(10, Math.min(window.innerHeight - 300, e.clientY - dragOffset.y)),
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 460,
        maxWidth: '92vw',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(37, 99, 235, 0.15)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
          <Keyboard size={16} />
          <span>मराठी कीबोर्ड (Marathi Touch Keypad)</span>
          <Sparkles size={13} color="#fbbf24" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="बंद करा (Close Keypad)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4px 8px',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('consonants')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderRadius: 6,
            background: activeTab === 'consonants' ? '#ffffff' : 'transparent',
            color: activeTab === 'consonants' ? '#1d4ed8' : '#64748b',
            boxShadow: activeTab === 'consonants' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
          }}
        >
          व्यंजन (Consonants)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vowels')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderRadius: 6,
            background: activeTab === 'vowels' ? '#ffffff' : 'transparent',
            color: activeTab === 'vowels' ? '#1d4ed8' : '#64748b',
            boxShadow: activeTab === 'vowels' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
          }}
        >
          स्वर व मात्रा (Vowels)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('numbers')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderRadius: 6,
            background: activeTab === 'numbers' ? '#ffffff' : 'transparent',
            color: activeTab === 'numbers' ? '#1d4ed8' : '#64748b',
            boxShadow: activeTab === 'numbers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
          }}
        >
          अंक (Numbers)
        </button>
      </div>

      {/* Keypad Buttons Container */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
        {/* Matras Quick Bar always visible */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', width: '100%', marginBottom: 2 }}>
            मात्रा (Diacritics / Matras):
          </span>
          {MATRAS.map((matra, i) => (
            <button
              key={i}
              type="button"
              onClick={() => insertCharacter(matra)}
              style={{
                padding: '4px 8px',
                fontSize: 14,
                fontWeight: 700,
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                borderRadius: 6,
                cursor: 'pointer',
                minWidth: 28,
              }}
            >
              क{matra}
            </button>
          ))}
        </div>

        {/* Consonants Tab */}
        {activeTab === 'consonants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CONSONANTS.map((group, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', gap: 4 }}>
                {group.map((char, colIdx) => (
                  <button
                    key={colIdx}
                    type="button"
                    onClick={() => insertCharacter(char)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      fontSize: 15,
                      fontWeight: 700,
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Vowels Tab */}
        {activeTab === 'vowels' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {VOWELS.map((char, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertCharacter(char)}
                style={{
                  padding: '10px 4px',
                  fontSize: 15,
                  fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f0fdf4')}
              >
                {char}
              </button>
            ))}
          </div>
        )}

        {/* Numbers Tab */}
        {activeTab === 'numbers' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {NUMBERS.map((num, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertCharacter(num)}
                style={{
                  padding: '10px 4px',
                  fontSize: 15,
                  fontWeight: 700,
                  background: '#faf5ff',
                  color: '#6b21a8',
                  border: '1px solid #e9d5ff',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3e8ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#faf5ff')}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls Bar (Space, Backspace, Clear) */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px',
          background: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => insertCharacter(' ')}
          style={{
            flex: 2,
            padding: '8px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ␣ जागा (Space)
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Delete size={14} /> ⌫ मिटवा
        </button>

        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '8px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          title="Clear all text"
        >
          सर्व पुहा (Clear)
        </button>
      </div>
    </div>
  );
};

export default MarathiKeyboard;
