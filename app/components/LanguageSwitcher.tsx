'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';

type LanguageSwitcherProps = {
  /** Trigger shows only the locale flag (no globe, label, or chevron). */
  flagOnly?: boolean;
  /** Dark header: translucent trigger for contrast on hero-style bars */
  tone?: 'default' | 'dark';
  /** Smaller flag button (with `flagOnly`, e.g. dense dashboard toolbar) */
  compact?: boolean;
};

export default function LanguageSwitcher({ flagOnly = false, tone = 'default', compact = false }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          flagOnly
            ? `Language: ${currentLang?.name ?? 'Select language'}. Click to change.`
            : undefined
        }
        className={
          flagOnly
            ? tone === 'dark'
              ? compact
                ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-base leading-none text-white shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/15'
                : 'flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-xl leading-none text-white shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/15'
              : compact
                ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-base leading-none text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
                : 'flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-xl leading-none text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
            : 'flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
        }
      >
        {flagOnly ? (
          <span aria-hidden>{currentLang?.flag}</span>
        ) : (
          <>
            <Globe className="h-4 w-4 shrink-0" />
            <span className="text-lg">{currentLang?.flag}</span>
            <span className="hidden sm:block">{currentLang?.name}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  currentLanguage === lang.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
                {currentLanguage === lang.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
