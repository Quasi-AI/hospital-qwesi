'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Bell, LogOut, HelpCircle } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from '../hooks/useTranslations';

type Props = {
  /** Match dense sidebar layout — tighter paddings and controls */
  compact?: boolean;
};

/**
 * Compact professional actions for the dashboard title row: language, notifications (with unread count),
 * help/settings, profile summary, logout.
 */
export default function DashboardTopToolbar({ compact = false }: Props) {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [unread, setUnread] = useState<number | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnread(typeof data.count === 'number' ? data.count : 0);
      } else {
        setUnread(0);
      }
    } catch {
      setUnread(null);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchUnread]);

  const role = session?.user?.role ?? '';
  const roleLabel =
    role === 'admin' || role === 'doctor' || role === 'staff'
      ? t(`dashboard.toolbar.role.${role}`)
      : role;

  const name = session?.user?.name?.trim() || '—';
  const initial = name.charAt(0).toUpperCase();

  const notifTitle =
    unread !== null && unread > 0
      ? t('dashboard.toolbar.unreadBadge', { count: unread })
      : t('navigation.notifications');

  const divider = compact ? 'mx-0.5 h-4 w-px' : 'mx-1 h-6 w-px';

  return (
    <div
      className={
        compact
          ? 'inline-flex max-w-full flex-wrap items-center justify-end rounded-lg border border-gray-200/90 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm'
          : 'inline-flex max-w-full flex-wrap items-center justify-end rounded-2xl border border-gray-200/90 bg-white/95 px-1.5 py-1.5 shadow-sm backdrop-blur-sm'
      }
    >
        <LanguageSwitcher flagOnly compact={compact} />
        <span className={`${divider} shrink-0 bg-gray-200`} aria-hidden />
        <Link
          href="/notifications"
          className={
            compact
              ? 'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
              : 'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
          }
          aria-label={notifTitle}
          title={notifTitle}
        >
          <Bell className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          {unread !== null && unread > 0 && (
            <span
              className={
                compact
                  ? 'absolute -right-px -top-px flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-semibold leading-none text-white shadow-sm'
                  : 'absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white shadow-sm'
              }
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
        <span className={`${divider} shrink-0 bg-gray-200`} aria-hidden />
        <Link
          href="/settings"
          className={
            compact
              ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 hover:text-gray-900'
          }
          aria-label={t('dashboard.toolbar.helpAria')}
          title={t('dashboard.toolbar.help')}
        >
          <HelpCircle className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </Link>
        <span className={`${divider} shrink-0 bg-gray-200`} aria-hidden />
        <Link
          href="/profile"
          className={
            compact
              ? 'flex min-w-0 max-w-[160px] items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-gray-50'
              : 'flex min-w-0 max-w-[200px] items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-gray-50'
          }
          title={t('dashboard.toolbar.openProfile')}
        >
          <div
            className={
              compact
                ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-semibold text-white shadow-sm'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-semibold text-white shadow-sm'
            }
          >
            {initial}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className={compact ? 'truncate text-xs font-medium text-gray-900 leading-tight' : 'truncate text-sm font-medium text-gray-900'}>
              {name}
            </p>
            <p className={compact ? 'truncate text-[11px] text-gray-500 leading-tight' : 'truncate text-xs text-gray-500'}>
              {roleLabel}
            </p>
          </div>
        </Link>
        <span className={`${divider} shrink-0 bg-gray-200`} aria-hidden />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={
            compact
              ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-red-50 hover:text-red-600'
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-red-50 hover:text-red-600'
          }
          aria-label={t('dashboard.toolbar.logoutAria')}
          title={t('profile.logout')}
        >
          <LogOut className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </button>
    </div>
  );
}

