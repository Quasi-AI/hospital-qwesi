'use client';

import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import enFallback from '@/messages/en.json';

interface Translations {
  [key: string]: unknown;
}

const messageCache: Record<string, Translations> = {};

function resolveTranslationString(messages: Translations, key: string): string | undefined {
  const keys = key.split('.');
  let value: unknown = messages;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in (value as object)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

function applyParams(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey]?.toString() || match;
  });
}

export function clearMessagesCache(locale?: string) {
  if (locale) delete messageCache[locale];
  else {
    for (const k of Object.keys(messageCache)) delete messageCache[k];
  }
}

async function fetchMessages(locale: string, signal: AbortSignal): Promise<Translations> {
  if (messageCache[locale]) return messageCache[locale];

  const res = await fetch(`/api/i18n/messages?locale=${encodeURIComponent(locale)}`, {
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    if (locale !== 'en') {
      return fetchMessages('en', signal);
    }
    return {};
  }
  const data = (await res.json()) as Translations;
  messageCache[locale] = data;
  return data;
}

export function useTranslations() {
  const { currentLanguage } = useLanguage();
  const [translations, setTranslations] = useState<Translations>({});
  const [isClient, setIsClient] = useState(false);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [messagesRevision, setMessagesRevision] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const currentLanguageRef = useRef(currentLanguage);
  currentLanguageRef.current = currentLanguage;

  const bumpMessagesIfActive = useCallback((locale?: string) => {
    if (!locale || locale === currentLanguageRef.current) {
      setMessagesRevision((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ locale?: string }>).detail;
      if (detail?.locale) clearMessagesCache(detail.locale);
      else clearMessagesCache();
      bumpMessagesIfActive(detail?.locale);
    };
    window.addEventListener('i18n-messages-updated', handler);
    return () => window.removeEventListener('i18n-messages-updated', handler);
  }, [bumpMessagesIfActive]);

  useEffect(() => {
    if (!isClient) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setTranslationsLoaded(false);

    fetchMessages(currentLanguage, ac.signal)
      .then((data) => {
        if (ac.signal.aborted) return;
        setTranslations(data);
        setTranslationsLoaded(true);
      })
      .catch((err) => {
        // Only ignore teardown of *this* effect. AbortError from another hook's
        // aborted fetch must not strand us with translationsLoaded === false.
        if (ac.signal.aborted) return;
        console.warn('Failed to load UI messages', err);
        setTranslations({});
        setTranslationsLoaded(true);
      });

    return () => ac.abort();
  }, [currentLanguage, isClient, messagesRevision]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const resolved =
      resolveTranslationString(translations, key) ?? resolveTranslationString(enFallback as Translations, key);

    if (resolved === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    return applyParams(resolved, params);
  }, [translations]);

  return { t, currentLanguage, isClient, translationsLoaded };
}
