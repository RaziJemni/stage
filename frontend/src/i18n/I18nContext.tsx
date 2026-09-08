import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Locale, I18nContextType } from './types';
import { fr } from './locales/fr';
import { en } from './locales/en';

const dictionaries: Record<Locale, Record<string, string>> = {
  fr,
  en,
};

const STORAGE_KEY = 'vayca_locale';
const DEFAULT_LOCALE: Locale = 'fr';

const defaultContextValue: I18nContextType = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string, params?: Record<string, string | number>) => {
    let text = fr[key] || en[key] || key;
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return text;
  },
};

const I18nContext = createContext<I18nContextType>(defaultContextValue);

export const I18nProvider: React.FC<{ children: ReactNode; initialLocale?: Locale }> = ({ 
  children,
  initialLocale 
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    }
    return DEFAULT_LOCALE;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
    let text = dict[key] || dictionaries['fr'][key] || dictionaries['en'][key] || key;
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return text;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}
