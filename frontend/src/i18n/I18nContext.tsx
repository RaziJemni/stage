import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  userPreferredLanguage?: string | null;
  onLocaleChange?: (locale: Locale) => Promise<void> | void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children,
  initialLocale,
  userPreferredLanguage,
  onLocaleChange,
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (userPreferredLanguage === 'fr' || userPreferredLanguage === 'en') return userPreferredLanguage;
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    }
    return DEFAULT_LOCALE;
  });

  const pendingUserLocaleRef = useRef<Locale | null>(null);
  const lastSyncedServerLanguage = useRef<string | null | undefined>(userPreferredLanguage);
  const currentLocaleRef = useRef<Locale>(locale);

  useEffect(() => {
    currentLocaleRef.current = locale;
  }, [locale]);

  useEffect(() => {
    if (userPreferredLanguage === 'fr' || userPreferredLanguage === 'en') {
      if (userPreferredLanguage === pendingUserLocaleRef.current) {
        pendingUserLocaleRef.current = null;
      }
      if (pendingUserLocaleRef.current && pendingUserLocaleRef.current !== userPreferredLanguage) {
        return;
      }
      if (userPreferredLanguage !== lastSyncedServerLanguage.current) {
        lastSyncedServerLanguage.current = userPreferredLanguage;
        setLocaleState(userPreferredLanguage);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, userPreferredLanguage);
        }
      }
    } else if (userPreferredLanguage !== undefined) {
      lastSyncedServerLanguage.current = userPreferredLanguage;
    }
  }, [userPreferredLanguage]);

  const setLocale = useCallback(async (newLocale: Locale) => {
    const previousLocale = currentLocaleRef.current;
    if (newLocale === previousLocale && !pendingUserLocaleRef.current) return;
    pendingUserLocaleRef.current = newLocale;
    setLocaleState(newLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, newLocale);
    }
    if (onLocaleChange) {
      try {
        await onLocaleChange(newLocale);
      } catch (err) {
        pendingUserLocaleRef.current = null;
        setLocaleState(previousLocale);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, previousLocale);
        }
        console.error('Failed to persist locale change:', err);
      }
    }
  }, [onLocaleChange]);

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
