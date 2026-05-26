'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export type TextDir = 'ltr' | 'rtl';

export type LanguageOption = { code: string; name: string; flag: string; dir?: TextDir };

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  availableLanguages: LanguageOption[];
  /** Resolved text direction for the active UI language */
  textDirection: TextDir;
  isClient: boolean;
  registryLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

function normalizeDir(d: unknown): TextDir {
  if (d === 'rtl') return 'rtl';
  return 'ltr';
}

function applyRegistryPayload(
  data: { languages?: LanguageOption[] },
  setAvailableLanguages: (l: LanguageOption[]) => void,
  setRegistryLoaded: (v: boolean) => void
) {
  if (Array.isArray(data.languages) && data.languages.length > 0) {
    setAvailableLanguages(
      data.languages.map((row) => ({
        ...row,
        dir: normalizeDir(row.dir),
      }))
    );
  }
  setRegistryLoaded(true);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [isClient, setIsClient] = useState(false);
  const [registryLoaded, setRegistryLoaded] = useState(false);

  const textDirection = useMemo((): TextDir => {
    const row = availableLanguages.find((l) => l.code === currentLanguage);
    return normalizeDir(row?.dir);
  }, [availableLanguages, currentLanguage]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/i18n/registry')
      .then((r) => r.json())
      .then((data: { languages?: LanguageOption[] }) => {
        if (cancelled) return;
        applyRegistryPayload(data, setAvailableLanguages, setRegistryLoaded);
      })
      .catch(() => {
        if (!cancelled) setRegistryLoaded(true);
      });

    const onRegistryUpdated = () => {
      fetch('/api/i18n/registry')
        .then((r) => r.json())
        .then((data: { languages?: LanguageOption[] }) => {
          applyRegistryPayload(data, setAvailableLanguages, setRegistryLoaded);
        })
        .catch(() => setRegistryLoaded(true));
    };

    window.addEventListener('i18n-registry-updated', onRegistryUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('i18n-registry-updated', onRegistryUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isClient || !registryLoaded) return;
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && availableLanguages.some((lang) => lang.code === savedLanguage)) {
      setCurrentLanguageState(savedLanguage);
    } else {
      setCurrentLanguageState('en');
      localStorage.setItem('language', 'en');
    }
  }, [isClient, registryLoaded, availableLanguages]);

  useEffect(() => {
    if (!isClient) return;
    document.documentElement.setAttribute('dir', textDirection);
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [isClient, textDirection, currentLanguage]);

  const setLanguage = useCallback(
    (lang: string) => {
      if (!availableLanguages.some((l) => l.code === lang)) return;
      setCurrentLanguageState(lang);
      localStorage.setItem('language', lang);
    },
    [availableLanguages]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        availableLanguages,
        textDirection,
        isClient,
        registryLoaded,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
