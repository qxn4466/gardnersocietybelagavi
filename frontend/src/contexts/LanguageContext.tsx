import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Lang } from '../i18n/translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  isMarathi: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  isMarathi: false,
});

const STORAGE_KEY = 'bgs_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'mr' || saved === 'en') ? saved as Lang : 'en';
  });

  const setLang = useCallback((newLang: Lang) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, isMarathi: lang === 'mr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => useContext(LanguageContext);

export default LanguageContext;
