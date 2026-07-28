import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translateBatch } from '../api/client';

/**
 * useTranslateData — translates an array of user-entered (dynamic) strings
 * via the backend's cache-first translation API.
 *
 * - Only translates when language is Marathi ('mr')
 * - Deduplicates texts before sending
 * - Returns a Map: original text → translated text
 * - Falls back to original text if translation fails
 * - Skips empty strings
 *
 * Usage:
 *   const { translationMap, translating } = useTranslateData(
 *     rows.map(r => r.customer_name),
 *   );
 *   const name = translationMap.get(row.customer_name) ?? row.customer_name;
 */
export const useTranslateData = (texts: string[], targetLang = 'mar_Deva') => {
  const { isMarathi } = useLanguage();
  const [translationMap, setTranslationMap] = useState<Map<string, string>>(new Map());
  const [translating, setTranslating] = useState(false);
  // Track last translated set to avoid redundant calls
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isMarathi) {
      setTranslationMap(new Map());
      return;
    }

    const cleanTexts = [...new Set(texts.filter(t => t && t.trim()))];
    if (cleanTexts.length === 0) {
      setTranslationMap(new Map());
      return;
    }

    const key = cleanTexts.sort().join('|') + '|' + targetLang;
    if (key === lastKeyRef.current) return; // already translated this exact set
    lastKeyRef.current = key;

    let cancelled = false;
    setTranslating(true);

    translateBatch(cleanTexts, targetLang)
      .then(result => {
        if (cancelled) return;
        setTranslationMap(new Map(Object.entries(result)));
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[useTranslateData] translation failed, using original text:', err);
        // Fallback: identity map
        const fallback = new Map(cleanTexts.map(t => [t, t]));
        setTranslationMap(fallback);
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => { cancelled = true; };
  }, [isMarathi, texts, targetLang]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Convenience function: returns translated text or original as fallback.
   */
  const tr = (text: string): string => {
    if (!isMarathi) return text;
    return translationMap.get(text) ?? text;
  };

  return { translationMap, translating, tr };
};

export default useTranslateData;
