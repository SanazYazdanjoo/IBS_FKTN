/** Sprachkontext: gewählte Locale im Speicher + localStorage, Header-Umschalter (FR-15, P1). */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { SUPPORTED_LOCALES, TRANSLATIONS, type Locale, type TnFlowStrings } from './translations';

const LOCALE_STORAGE_KEY = 'ibs-locale';

function isSupportedLocale(value: string | null): value is Locale {
  return value !== null && (SUPPORTED_LOCALES as string[]).includes(value);
}

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : 'de';
  } catch {
    return 'de';
  }
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // localStorage kann in Ausnahmefällen fehlen (privater Modus etc.) — Auswahl bleibt für die Sitzung gültig.
    }
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

/** Typed key→string lookup for the current locale — TN flow only in this pass (FR-15). */
export function useT(): TnFlowStrings {
  const { locale } = useLocale();
  return TRANSLATIONS[locale];
}
