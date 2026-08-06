import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, X, Delete, Sparkles, Hash, Type } from 'lucide-react';

interface MarathiKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertChar?: (char: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

// Complete Advanced Devanagari & Marathi Character Sets
const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः', 'ॲ', 'ऑ'];

const MATRAS = [
  { label: 'ा (आ)', char: 'ा' },
  { label: 'ि (इ)', char: 'ि' },
  { label: 'ी (ई)', char: 'ी' },
  { label: 'ु (उ)', char: 'ु' },
  { label: 'ू (ऊ)', char: 'ू' },
  { label: 'ृ (ऋ)', char: 'ृ' },
  { label: 'े (ए)', char: 'े' },
  { label: 'ै (ऐ)', char: 'ै' },
  { label: 'ो (ओ)', char: 'ो' },
  { label: 'ौ (औ)', char: 'ौ' },
  { label: 'ॅ (कॅप)', char: 'ॅ' },
  { label: 'ॉ (ऑ)', char: 'ॉ' },
  { label: 'ं (अनुस्वार)', char: 'ं' },
  { label: 'ः (विसर्ग)', char: 'ः' },
  { label: '़ (नुक्ता)', char: '़' },
  { label: '् (हसंत/जोडाक्षर)', char: '्' },
];

const CONSONANTS = [
  ['क', 'ख', 'ग', 'घ', 'ङ'],
  ['च', 'छ', 'ज', 'झ', 'ञ'],
  ['ट', 'ठ', 'ड', 'ढ', 'ण'],
  ['त', 'थ', 'द', 'ध', 'न'],
  ['प', 'फ', 'ब', 'भ', 'म'],
  ['य', 'र', 'ल', 'व', 'श'],
  ['ष', 'स', 'ह', 'ळ', 'क्ष', 'ज्ञ']
];

const CONJUNCTS = [
  ['क्ष', 'ज्ञ', 'त्र', 'श्र', 'द्व', 'द्य'],
  ['प्र', 'ट्र', 'क्र', 'ग्र', 'द्र', 'भ्र'],
  ['्या', '्त', '्न', '्म', '्ल', 'ष्ट'],
  ['ष्ठ', 'ग्ध', 'ण्ड', 'ंचे', 'ंच्या', '्']
];

const NUMBERS_MARATHI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const NUMBERS_ENGLISH = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SYMBOLS = ['₹', '%', '.', ',', '-', '+', '/', '*', '=', '(', ')', '#', '@', '।'];

export const MarathiKeyboard: React.FC<MarathiKeyboardProps> = ({
  isOpen,
  onClose,
  onInsertChar,
  onBackspace,
  onClear,
  targetInputRef,
}) => {
  const [activeTab, setActiveTab] = useState<'consonants' | 'vowels' | 'conjuncts' | 'numbers'>('consonants');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const keyboardContainerRef = useRef<HTMLDivElement>(null);

  // Maintain reference to the last focused input field in the document
  const lastFocusedInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleActiveField = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (keyboardContainerRef.current && !keyboardContainerRef.current.contains(target)) {
          lastFocusedInputRef.current = target as HTMLInputElement | HTMLTextAreaElement;
        }
      }
    };

    document.addEventListener('focusin', handleActiveField, true);
    document.addEventListener('click', handleActiveField, true);
    document.addEventListener('pointerdown', handleActiveField, true);
    return () => {
      document.removeEventListener('focusin', handleActiveField, true);
      document.removeEventListener('click', handleActiveField, true);
      document.removeEventListener('pointerdown', handleActiveField, true);
    };
  }, []);

  const getActiveInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    if (targetInputRef?.current) return targetInputRef.current;
    const active = document.activeElement as HTMLElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      if (!keyboardContainerRef.current || !keyboardContainerRef.current.contains(active)) {
        return active as HTMLInputElement | HTMLTextAreaElement;
      }
    }
    if (lastFocusedInputRef.current && document.body.contains(lastFocusedInputRef.current)) {
      return lastFocusedInputRef.current;
    }
    return null;
  };

  const setInputValueNative = (input: HTMLInputElement | HTMLTextAreaElement, newValue: string, newPos: number) => {
    // If field is HTML5 type="number", convert Devanagari numerals to standard digits
    let valToSet = newValue;
    if (input.type === 'number') {
      const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
      valToSet = valToSet.split('').map(char => {
        const idx = devanagariDigits.indexOf(char);
        return idx !== -1 ? String(idx) : char;
      }).join('');
    }

    const tracker = (input as any)._valueTracker;
    if (tracker) {
      tracker.setValue(input.value + '_diff');
    }

    const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, valToSet);
    } else {
      input.value = valToSet;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    input.focus();
    try {
      input.setSelectionRange(newPos, newPos);
    } catch {
      // Ignore setSelectionRange on unsupported inputs (e.g. number/date)
    }
  };

  // Focus and insert text into target input
  const insertCharacter = (char: string) => {
    if (onInsertChar) {
      onInsertChar(char);
    }

    const input = getActiveInput();
    if (input) {
      let start = input.value.length;
      let end = input.value.length;
      try {
        if (input.selectionStart !== null && input.selectionEnd !== null) {
          start = input.selectionStart;
          end = input.selectionEnd;
        }
      } catch {
        // Fallback for number/date inputs
      }

      const value = input.value;
      const newValue = value.substring(0, start) + char + value.substring(end);

      setInputValueNative(input, newValue, start + char.length);
    }
  };

  const handleBackspace = () => {
    if (onBackspace) {
      onBackspace();
    }
    const input = getActiveInput();
    if (input) {
      let start = input.value.length;
      let end = input.value.length;
      try {
        if (input.selectionStart !== null && input.selectionEnd !== null) {
          start = input.selectionStart;
          end = input.selectionEnd;
        }
      } catch {
        // Fallback for number/date inputs
      }

      const value = input.value;
      let newValue = value;
      let newPos = start;

      if (start === end && start > 0) {
        newValue = value.substring(0, start - 1) + value.substring(end);
        newPos = start - 1;
      } else if (start !== end) {
        newValue = value.substring(0, start) + value.substring(end);
        newPos = start;
      }

      setInputValueNative(input, newValue, newPos);
    }
  };

  const handleClear = () => {
    if (onClear) onClear();
    const input = getActiveInput();
    if (input) {
      setInputValueNative(input, '', 0);
    }
  };

  // Drag handlers
  const handleMouseDownHeader = (e: React.MouseEvent) => {
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
          x: Math.max(10, Math.min(window.innerWidth - 480, e.clientX - dragOffset.x)),
          y: Math.max(10, Math.min(window.innerHeight - 340, e.clientY - dragOffset.y)),
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

  const preventFocusSteal = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      ref={keyboardContainerRef}
      className="marathi-keyboard-container no-print"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 480,
        maxWidth: '94vw',
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(37, 99, 235, 0.2)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Header Bar */}
      <div
        onMouseDown={handleMouseDownHeader}
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
          <span>प्रगत मराठी टायपिंग कीबोर्ड (Advanced Marathi Keypad)</span>
          <Sparkles size={13} color="#fbbf24" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onMouseDown={preventFocusSteal}
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

      {/* Navigation Tab Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '6px 8px 0',
          gap: 4,
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => setActiveTab('consonants')}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'consonants' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'consonants' ? '#ffffff' : 'transparent',
            color: activeTab === 'consonants' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
          }}
        >
          क ख ग (व्यंजने)
        </button>
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => setActiveTab('vowels')}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'vowels' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'vowels' ? '#ffffff' : 'transparent',
            color: activeTab === 'vowels' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
          }}
        >
          अ आ / मात्रा
        </button>
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => setActiveTab('conjuncts')}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'conjuncts' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'conjuncts' ? '#ffffff' : 'transparent',
            color: activeTab === 'conjuncts' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
          }}
        >
          क्ष ज्ञ (जोडाक्षरे)
        </button>
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => setActiveTab('numbers')}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'numbers' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'numbers' ? '#ffffff' : 'transparent',
            color: activeTab === 'numbers' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
          }}
        >
          १ २ ३ (संख्या)
        </button>
      </div>

      {/* Main Keys Area */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {/* TAB 1: CONSONANTS (व्यंजने) */}
        {activeTab === 'consonants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CONSONANTS.map((row, rIdx) => (
              <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 6 }}>
                {row.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(char)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 15,
                      fontWeight: 700,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      color: '#1e3a8a',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: VOWELS & MATRAS (स्वर व मात्रा) */}
        {activeTab === 'vowels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                स्वर (Vowels)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {VOWELS.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(char)}
                    style={{
                      padding: '7px 4px',
                      fontSize: 14,
                      fontWeight: 700,
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: 8,
                      color: '#92400e',
                      cursor: 'pointer',
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                मात्रा व चिन्हे (Vowel Signs / Matras & Virama)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {MATRAS.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(item.char)}
                    style={{
                      padding: '6px 4px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      color: '#166534',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONJUNCTS (जोडाक्षरे) */}
        {activeTab === 'conjuncts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
              विशेष जोडाक्षरे व रफार (Special Conjuncts & Halant)
            </div>
            {CONJUNCTS.map((row, rIdx) => (
              <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 6 }}>
                {row.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(char)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 14,
                      fontWeight: 700,
                      background: '#f3e8ff',
                      border: '1px solid #e9d5ff',
                      borderRadius: 8,
                      color: '#6b21a8',
                      cursor: 'pointer',
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: NUMBERS & SYMBOLS (संख्या व चिन्हे) */}
        {activeTab === 'numbers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                मराठी आकडे (Devanagari Digits)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {NUMBERS_MARATHI.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(num)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 15,
                      fontWeight: 800,
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 8,
                      color: '#065f46',
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                Standard English Digits
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {NUMBERS_ENGLISH.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(num)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 15,
                      fontWeight: 800,
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                चिन्हे व रूपया (Symbols & Currency)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onMouseDown={preventFocusSteal}
                    onClick={() => insertCharacter(sym)}
                    style={{
                      padding: '6px 4px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      borderRadius: 6,
                      color: '#0369a1',
                      cursor: 'pointer',
                    }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer (Space, Backspace, Clear) */}
      <div
        style={{
          background: '#f1f5f9',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={() => insertCharacter(' ')}
          style={{
            flex: 2,
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            color: '#334155',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          स्पेस (Spacebar)
        </button>

        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={handleBackspace}
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 700,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
          title="Backspace"
        >
          <Delete size={14} />
          <span>हटवा</span>
        </button>

        <button
          type="button"
          onMouseDown={preventFocusSteal}
          onClick={handleClear}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 700,
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            color: '#b91c1c',
            cursor: 'pointer',
          }}
        >
          सर्व स्पष्ट
        </button>
      </div>
    </div>
  );
};

export default MarathiKeyboard;
