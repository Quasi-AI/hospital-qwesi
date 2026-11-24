/** Short two-note chime generated with Web Audio (no audio file needed). Browsers only allow sound after the user has
 * interacted with the page once, so we unlock on the first click/tap/key press. */
let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAlertSound() {
  if (unlocked || typeof window === 'undefined') return;
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    unlocked = true;
    ['click', 'touchstart', 'keydown'].forEach((e) => window.removeEventListener(e, unlock));
  };
  ['click', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
}

export const isAlertSoundOn = () => {
  try { return localStorage.getItem('qwesi:sound') !== 'off'; } catch { return true; }
};
export const setAlertSoundOn = (on: boolean) => {
  try { localStorage.setItem('qwesi:sound', on ? 'on' : 'off'); } catch { /* ignore */ }
};

export function playAlertSound() {
  if (!isAlertSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  [[880, 0], [1318.5, 0.16]].forEach(([freq, delay]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.32);
    osc.connect(gain).connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.35);
  });
}
