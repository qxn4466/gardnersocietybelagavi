import { useLanguage } from '../contexts/LanguageContext';
import { translations, type TranslationKey } from '../i18n/translations';

/**
 * useTranslation — returns a `t()` function for static UI label lookups.
 * Uses the current language from LanguageContext.
 *
 * Usage:
 *   const { t, lang, isMarathi } = useTranslation();
 *   <button>{t('btn_save')}</button>
 */
export const useTranslation = () => {
  const { lang, setLang, isMarathi } = useLanguage();

  const t = (key: TranslationKey): string => {
    return translations[lang][key] ?? translations['en'][key] ?? key;
  };

  return { t, lang, setLang, isMarathi };
};

export default useTranslation;
