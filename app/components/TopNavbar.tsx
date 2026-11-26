'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Bell, BellOff, Check, CheckCheck, ChevronDown, LogOut, Menu, User, Volume2, VolumeX } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import TimeZoneSelect from './TimeZoneSelect';
import { LogoLink } from './logo';
import { playAlertSound, unlockAlertSound, isAlertSoundOn, setAlertSoundOn } from '@/lib/alertSound';

type Item = { _id: string; title: string; message: string; status: string; type?: string; createdAt: string; relatedEntity?: { type: string; id: string } };

const ago = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

/**
 * Top bar for every signed-in page: menu button (mobile), language, notification bell with dropdown
 * (mark read / mark all read / sound on-off, chime on incoming) and the profile menu.
 */
export default function TopNavbar({
  onMenu,
  homeHref = '/dashboard',
  profileHref = '/profile',
  notificationsHref = '/notifications',
}: {
  onMenu?: () => void;
  homeHref?: string;
  profileHref?: string;
  notificationsHref?: string | null;
}) {
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const lastCount = useRef<number | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSoundOn(isAlertSoundOn()); unlockAlertSound(); }, []);

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        fetch('/api/notifications/unread-count', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { count: 0 })),
        fetch('/api/notifications?limit=10&scope=mine', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { notifications: [] })),
      ]);
      const count = typeof c.count === 'number' ? c.count : 0;
      // a higher unread count than before (found by polling) means something new arrived
      if (lastCount.current !== null && count > lastCount.current) playAlertSound();
      lastCount.current = count;
      setUnread(count);
      setItems(Array.isArray(l.notifications) ? l.notifications : []);
    } catch { /* keep what we have */ }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    load();
    const timer = setInterval(load, 45_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    const onChanged = () => load();
    // instant chime for live events from the realtime server
    const onRealtime = (e: Event) => {
      const t = (e as CustomEvent).detail?.type as string | undefined;
      if (t === 'notification.created' || t === 'message.created') {
        lastCount.current = (lastCount.current ?? 0) + 1; // avoid a second chime when the poll catches up
        playAlertSound();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('qwesi:notifications-changed', onChanged);
    window.addEventListener('qwesi:realtime', onRealtime);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('qwesi:notifications-changed', onChanged);
      window.removeEventListener('qwesi:realtime', onRealtime);
    };
  }, [load, session?.user?.id]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const markRead = async (id: string) => {
    setItems((xs) => xs.map((x) => (x._id === id ? { ...x, status: 'read' } : x)));
    setUnread((n) => Math.max(0, n - 1));
    lastCount.current = Math.max(0, (lastCount.current ?? 1) - 1);
    await fetch(`/api/notifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markAsRead' }) }).catch(() => {});
    window.dispatchEvent(new CustomEvent('qwesi:notifications-changed'));
  };
  const markAll = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, status: 'read' })));
    setUnread(0);
    lastCount.current = 0;
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    window.dispatchEvent(new CustomEvent('qwesi:notifications-changed'));
  };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAlertSoundOn(next);
    if (next) playAlertSound();
  };

  const name = session?.user?.name?.trim() || 'Account';
  const role = String(session?.user?.role || '');
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  const initial = name.charAt(0).toUpperCase();
  const isUnread = (n: Item) => n.status === 'pending' || n.status === 'sent';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-brand-100 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-5 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {onMenu && (
          <button type="button" onClick={onMenu} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 lg:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        )}
        <LogoLink href={homeHref} className="h-6 lg:hidden" />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <TimeZoneSelect compact />
        <LanguageSwitcher flagOnly compact />

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => { setBellOpen((v) => !v); setProfileOpen(false); if (!bellOpen) load(); }}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${unread > 0 ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
            aria-expanded={bellOpen}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow ring-2 ring-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Notifications{unread > 0 ? ` (${unread})` : ''}</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={toggleSound} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title={soundOn ? 'Sound on — click to mute' : 'Sound off — click to turn on'} aria-label="Toggle notification sound">
                    {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={markAll} disabled={unread === 0} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-40">
                    <CheckCheck className="h-4 w-4" /> Mark all read
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-gray-500">
                    <BellOff className="h-6 w-6" />
                    <p className="text-sm">You&apos;re all caught up</p>
                  </div>
                ) : (
                  items.map((n) => (
                    <div key={n._id} className={`flex gap-3 border-b border-gray-50 px-4 py-3 ${isUnread(n) ? 'bg-brand-50/60' : ''}`}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread(n) ? 'bg-brand-600' : 'bg-transparent'}`} />
                      {n.type === 'direct_message' ? (
                        <Link
                          href={role === 'patient' ? '/patient-portal/messages' : '/messages'}
                          onClick={() => { if (isUnread(n)) markRead(n._id); setBellOpen(false); }}
                          className="min-w-0 flex-1"
                        >
                          <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="line-clamp-2 text-xs text-gray-600">{n.message}</p>
                          <p className="mt-1 text-[11px] text-gray-400">{ago(n.createdAt)} · Open message</p>
                        </Link>
                      ) : (
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-gray-600">{n.message}</p>
                        <p className="mt-1 text-[11px] text-gray-400">{ago(n.createdAt)}</p>
                      </div>
                      )}
                      {isUnread(n) && (
                        <button type="button" onClick={() => markRead(n._id)} className="h-8 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-brand-700" title="Mark as read" aria-label="Mark as read">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {notificationsHref && (
                <Link href={notificationsHref} onClick={() => setBellOpen(false)} className="block border-t border-gray-100 px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
                View all notifications
              </Link>
              )}
            </div>
          )}
        </div>

        {/* Profile menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => { setProfileOpen((v) => !v); setBellOpen(false); }}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-gray-100"
            aria-expanded={profileOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">{initial}</span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[140px] truncate text-sm font-medium leading-tight text-gray-900">{name}</span>
              <span className="block text-[11px] leading-tight text-gray-500">{roleLabel}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                <p className="truncate text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <Link href={profileHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User className="h-4 w-4" /> Profile &amp; settings
              </Link>
              <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
