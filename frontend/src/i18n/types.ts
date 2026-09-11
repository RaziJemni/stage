export type Locale = 'fr' | 'en';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void> | void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
