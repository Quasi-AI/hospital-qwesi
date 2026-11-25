'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { browserTimeZone, isValidTimeZone, safeTimeZone, DEFAULT_TIME_ZONE } from '@/lib/timezone';

const KEY = 'qwesi:tz';
const EVENT = 'qwesi:tz-changed';

function stored(): string | null {
  try { const v = localStorage.getItem(KEY); return isValidTimeZone(v) ? v : null; } catch { return null; }
}

/** The viewer's own time zone: saved on their account, remembered in the browser, otherwise detected. */
export function useViewerTimeZone() {
  const { data: session } = useSession();
  const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

  // Not signed in and nothing chosen yet: use the location of the IP address.
  useEffect(() => {
    if (stored()) return;
    fetch('/api/timezone/detect', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && isValidTimeZone(d.timeZone) && !stored()) setTz(d.timeZone); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTz(stored() || browserTimeZone());
    const onChange = () => setTz(stored() || browserTimeZone());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  // Adopt the zone saved on the account; first time ever, save the detected one so emails and reminders use it too.
  useEffect(() => {
    if (!session?.user?.email) return;
    let cancelled = false;
    fetch('/api/me/timezone', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (isValidTimeZone(d.timeZone)) {
          try { localStorage.setItem(KEY, d.timeZone); } catch { /* ignore */ }
          setTz(d.timeZone);
        } else {
          if (isValidTimeZone(d.detected)) setTz(d.detected);
          // Providers' zone also defines their working hours, so only patients get it saved automatically.
          if (session.user.role === 'patient') fetch('/api/me/timezone', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timeZone: isValidTimeZone(d.detected) ? d.detected : browserTimeZone() }) }).catch(() => {});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session?.user?.email]);

  const update = useCallback(async (next: string) => {
    const zone = safeTimeZone(next);
    try { localStorage.setItem(KEY, zone); } catch { /* ignore */ }
    setTz(zone);
    window.dispatchEvent(new Event(EVENT));
    await fetch('/api/me/timezone', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timeZone: zone }) }).catch(() => {});
  }, []);

  return { timeZone: tz, setTimeZone: update };
}
