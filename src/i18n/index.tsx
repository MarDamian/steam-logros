import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@shared/types';
import { en } from './en';
import { es, type MessageKey } from './es';

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { es, en };
const STORAGE_KEY = 'logros:locale';

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  formatDate: (secondsSinceEpoch: number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Español por defecto siempre; el inglés solo si la persona lo eligió antes. */
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback<Translate>(
    (key, values) => {
      const template = DICTIONARIES[locale][key] ?? DICTIONARIES.es[key] ?? key;
      if (!values) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
      );
    },
    [locale],
  );

  const value = useMemo<I18nValue>(() => {
    const intlLocale = locale === 'es' ? 'es-AR' : 'en-US';
    return {
      locale,
      setLocale: setLocaleState,
      t,
      formatDate: (seconds) =>
        new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long' }).format(new Date(seconds * 1000)),
      formatNumber: (number, options) => new Intl.NumberFormat(intlLocale, options).format(number),
    };
  }, [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n necesita estar dentro de <I18nProvider>');
  return value;
}
