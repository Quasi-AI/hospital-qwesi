'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, Camera, ShieldAlert, Loader2, ExternalLink, Coins, Info } from 'lucide-react';

type Phase = 'idle' | 'starting' | 'listening' | 'thinking' | 'speaking' | 'ended';
type Cfg = { enabled: boolean; avatarUrl: string; doctorName: string; cameraEnabled: boolean };

const TOPUPS = [10, 20, 50, 100];
const SILENCE_MS = 900;
const MIN_SPEECH_MS = 350;
const MAX_UTTERANCE_MS = 25_000;

/** 16-bit mono WAV @16 kHz from float samples captured at the device rate. */
function toWav(chunks: Float32Array[], rate: number) {
  let len = 0; chunks.forEach((c) => (len += c.length));
  const all = new Float32Array(len); let o = 0; chunks.forEach((c) => { all.set(c, o); o += c.length; });
  const ratio = rate / 16000; const n = Math.floor(all.length / ratio); const pcm = new Int16Array(n);
  for (let i = 0; i < n; i += 1) {
    const a = Math.floor(i * ratio); const b = Math.min(all.length, Math.floor((i + 1) * ratio)); let sum = 0;
    for (let j = a; j < b; j += 1) sum += all[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, b - a))); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2); const dv = new DataView(buf);
  const w = (off: number, s: string) => [...s].forEach((ch, i) => dv.setUint8(off + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, pcm.length * 2, true); new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}

export default function AiDoctorPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const sym = currency === 'USD' ? '$' : 'GH₵';
  const [muted, setMuted] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [custom, setCustom] = useState('');
  const [linked, setLinked] = useState('');

  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const refs = useRef({ phase: 'idle' as Phase, muted: false, avatarReady: false, speaking: false, endAfter: false, stream: null as MediaStream | null, ctx: null as AudioContext | null, lookTimer: 0 as any, cleanup: () => {} });
  const setPh = (p: Phase) => { refs.current.phase = p; setPhase(p); };

  useEffect(() => { fetch('/api/ai-doctor/config').then((r) => r.json()).then(setCfg).catch(() => setCfg({ enabled: false, avatarUrl: '', doctorName: '', cameraEnabled: false })); }, []);
  useEffect(() => { refs.current.muted = muted; }, [muted]);
  // Show the credit balance (and which number it is linked to) before the call starts
  useEffect(() => { if (!cfg?.enabled) return; api('session').then((s) => { setBalance(s.balance); if (s.currency) setCurrency(s.currency); setLinked(s.linkedPhone || ''); }).catch(() => {}); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.enabled]);

  const toAvatar = useCallback((m: any) => frame.current?.contentWindow?.postMessage({ target: 'ai-doctor-avatar', ...m }, location.origin), []);

  // Messages from the avatar frame
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.source !== 'ai-doctor-avatar') return;
      const d = e.data;
      if (d.type === 'loaded' && cfg?.avatarUrl) toAvatar({ type: 'load', url: cfg.avatarUrl });
      if (d.type === 'ready') refs.current.avatarReady = true;
      if (d.type === 'error') setError('The avatar had a problem. Please reload the page.');
      if (d.type === 'speaking') {
        refs.current.speaking = d.value;
        if (d.value) setPh('speaking');
        else if (refs.current.endAfter) endConsult(false);
        else if (refs.current.phase === 'speaking') setPh('listening');
      }
    };
    addEventListener('message', on); return () => removeEventListener('message', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  const api = async (action: string, body?: any) => {
    const r = await fetch(`/api/ai-doctor/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j;
  };

  const play = (r: any) => {
    if (r.audio) toAvatar({ type: 'speak', audio: r.audio, text: r.spoken || r.reply || '', mood: r.mood });
    setCaption(r.spoken || r.reply || '');
  };

  async function sendUtterance(wav: Blob) {
    setPh('thinking'); setHeard(''); setSuggest([]); setLinks([]);
    try {
      const res = await fetch('/api/ai-doctor/turn', { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav });
      const r = await res.json();
      if (!res.ok || !r.success) throw new Error(r.error || 'The doctor did not answer');
      if (r.ignored) { setPh('listening'); return; }
      if (typeof r.balance === 'number') setBalance(r.balance);
      setHeard(r.transcript || ''); setUrgent(Boolean(r.urgent));
      setLinks(r.links || []); setSuggest((r.choices || []).map((c: any) => c.text));
      if (r.end) refs.current.endAfter = true;
      setBlocked(Boolean(r.blocked));
      play(r);
      if (!r.audio) setPh('listening');
    } catch (e: any) { setError(e.message); setPh('listening'); }
  }

  // Hands-free listening: voice activity detection, barge-in, WAV upload
  async function startListening(stream: MediaStream) {
    const ctx = new AudioContext(); refs.current.ctx = ctx; await ctx.resume();
    const src = ctx.createMediaStreamSource(stream); const proc = ctx.createScriptProcessor(2048, 1, 1);
    const mute = ctx.createGain(); mute.gain.value = 0; src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
    const frameMs = (2048 / ctx.sampleRate) * 1000;
    let floor = 0.01; let rec: Float32Array[] | null = null; let speechMs = 0; let quietMs = 0; let loudMs = 0; let total = 0;
    const pre: Float32Array[] = []; const preMax = Math.ceil(350 / frameMs);
    proc.onaudioprocess = (e) => {
      const x = new Float32Array(e.inputBuffer.getChannelData(0)); let s = 0; for (let i = 0; i < x.length; i += 1) s += x[i] * x[i];
      const rms = Math.sqrt(s / x.length); const thr = Math.max(0.02, floor * 4); const loud = rms > thr;
      const ph = refs.current.phase;
      if (!loud) floor = floor * 0.97 + rms * 0.03;
      if (refs.current.muted || ph === 'thinking' || ph === 'starting' || ph === 'ended') { rec = null; loudMs = 0; return; }
      if (!rec) {
        pre.push(x); if (pre.length > preMax) pre.shift();
        loudMs = loud ? loudMs + frameMs : 0;
        const need = refs.current.speaking ? 450 : 130; // stricter while the doctor is talking (barge-in)
        if (loudMs >= need) {
          if (refs.current.speaking) { toAvatar({ type: 'stop' }); refs.current.speaking = false; }
          rec = [...pre]; pre.length = 0; speechMs = loudMs; quietMs = 0; total = rec.length * frameMs; setPh('listening');
        }
        return;
      }
      rec.push(x); total += frameMs;
      if (loud) { speechMs += frameMs; quietMs = 0; } else quietMs += frameMs;
      if (quietMs >= SILENCE_MS || total >= MAX_UTTERANCE_MS) {
        const chunks = rec; const ok = speechMs >= MIN_SPEECH_MS; rec = null; loudMs = 0; speechMs = 0; quietMs = 0;
        if (ok) sendUtterance(toWav(chunks, ctx.sampleRate)); 
      }
    };
    refs.current.cleanup = () => { try { proc.disconnect(); src.disconnect(); ctx.close(); } catch {} };
  }

  // Camera: a small frame every ~25 s, analysed for visible, non-diagnostic signs. The picture is never stored.
  function startLooking() {
    const grab = async () => {
      const v = video.current; if (!v || !v.videoWidth || refs.current.phase === 'ended') return;
      const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * v.videoHeight / v.videoWidth);
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      try { await api('look', { image: c.toDataURL('image/jpeg', 0.6) }); } catch {}
    };
    setTimeout(grab, 3000); refs.current.lookTimer = setInterval(grab, 25_000);
  }

  async function startConsult() {
    setError(''); setPh('starting'); setUrgent(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: useCamera ? { facingMode: 'user', width: 320 } : false });
      refs.current.stream = stream;
      if (useCamera && video.current) { video.current.srcObject = stream; await video.current.play().catch(() => {}); setCameraOn(true); startLooking(); }
      const s = await api('session');
      setBalance(s.balance); if (s.currency) setCurrency(s.currency); setLinked(s.linkedPhone || ''); setBlocked(false);
      await startListening(stream);
      for (let i = 0; i < 100 && !refs.current.avatarReady; i += 1) await new Promise((r) => setTimeout(r, 150));
      const g = await api('speak', { text: s.greeting });
      setPh('speaking'); play({ ...g, spoken: s.greeting, mood: 'happy' });
    } catch (e: any) {
      setError(/denied|permission|NotAllowed/i.test(e?.message) ? 'Please allow the microphone so the doctor can hear you.' : (e?.message || 'Could not start'));
      endConsult(false); setPh('idle');
    }
  }

  function endConsult(sayBye = true) {
    clearInterval(refs.current.lookTimer); refs.current.cleanup();
    refs.current.stream?.getTracks().forEach((t) => t.stop()); refs.current.stream = null;
    toAvatar({ type: 'stop' }); refs.current.endAfter = false; setCameraOn(false);
    setPh('ended'); if (sayBye) setCaption('Take care. You can start another consultation any time.');
  }
  useEffect(() => () => { clearInterval(refs.current.lookTimer); refs.current.cleanup(); refs.current.stream?.getTracks().forEach((t) => t.stop()); }, []);

  async function topUp(amount: number) {
    setTopupBusy(true); setError('');
    try { const r = await api('topup', { amount }); window.open(r.url, '_blank', 'noopener'); }
    catch (e: any) { setError(e.message); } finally { setTopupBusy(false); }
  }

  const live = !['idle', 'ended'].includes(phase);
  const status = { idle: '', starting: 'Connecting…', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…', ended: 'Consultation ended' }[phase];
  const dot = phase === 'speaking' ? 'bg-[#a995ff]' : phase === 'listening' ? 'bg-white' : phase === 'thinking' ? 'bg-amber-300' : 'bg-white/40';

  if (!cfg) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#6949ED]" /></div>;
  if (!cfg.enabled) return (
    <div className="mx-auto max-w-lg p-4 sm:p-10">
      <div className="rounded-3xl border border-white/60 bg-white/70 p-8 text-center shadow-xl backdrop-blur-xl">
        <Video className="mx-auto mb-3 h-8 w-8 text-[#6949ED]" />
        <h1 className="text-xl font-semibold text-black">My AI Doctor</h1>
        <p className="mt-2 text-sm text-gray-600">The video consultation is not available yet. Please check back soon.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden p-3 sm:p-5 lg:p-6">
      <div className="mb-4 min-w-0">
        <h1 className="text-xl font-semibold text-black sm:text-2xl">My AI Doctor</h1>
        <p className="text-sm text-gray-600">A private video consultation with {cfg.doctorName}. Just talk, as you would on a call.</p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Stage ─────────────────────────────────────────── */}
        <div className="min-w-0">
          <div
            className="relative isolate overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-[#7457f0] via-[#5a3fd1] to-[#241567] shadow-2xl"
            style={{ height: 'clamp(440px, 74dvh, 780px)', contain: 'layout paint', transform: 'translateZ(0)' }}
          >
            <iframe ref={frame} src="/ai-doctor/avatar.html" title={cfg.doctorName} allow="autoplay" className="absolute inset-0 h-full w-full border-0" />
            <video ref={video} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />

            {/* top bar */}
            <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 text-xs text-white">
              <span className="flex min-w-0 items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot} ${live ? 'animate-pulse' : ''}`} />
                <span className="truncate">{live ? (status || 'Live') : 'Ready'} · AI doctor</span>
              </span>
              {cameraOn && <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur"><Camera className="h-3 w-3" /> Camera on</span>}
            </div>

            {urgent && (
              <div className="absolute inset-x-3 top-14 z-20 flex items-start gap-2 rounded-2xl bg-red-600/95 p-3 text-sm text-white shadow-lg">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> This may be an emergency. Call your local emergency number now (112 in Ghana).
              </div>
            )}

            {/* lobby: shown before the call starts */}
            {!live && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#1b1050]/70 p-5 text-center text-white backdrop-blur-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15"><Video className="h-7 w-7" /></div>
                <div>
                  <h2 className="text-lg font-semibold">{phase === 'ended' ? 'Consultation ended' : 'Ready when you are'}</h2>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-white/80">{phase === 'ended' ? 'Take care. You can start another consultation any time.' : 'Allow your microphone, then tell the doctor what has been bothering you.'}</p>
                </div>
                {cfg.cameraEnabled && (
                  <label className="flex max-w-sm cursor-pointer items-start gap-2 rounded-2xl bg-white/10 p-3 text-left text-xs leading-relaxed text-white/90">
                    <input type="checkbox" checked={useCamera} onChange={(e) => setUseCamera(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
                    <span>Let the doctor see me through my camera. A small picture is analysed now and then for visible signs such as tiredness or a rash. It is never saved and is not a diagnosis.</span>
                  </label>
                )}
                <button onClick={startConsult} disabled={phase === 'starting'} className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#4a2fc4] shadow-lg transition hover:scale-[1.02] disabled:opacity-60">
                  <Video className="h-4 w-4" /> {phase === 'ended' ? 'Start another consultation' : 'Start video consultation'}
                </button>
                {error && <p className="max-w-xs rounded-xl bg-white/90 p-2 text-xs text-red-700">{error}</p>}
              </div>
            )}

            {/* captions, top-up, call controls */}
            {live && (
              <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 pb-4 pt-20 text-white">
                {heard && <p className="mx-auto max-w-xl truncate text-center text-xs italic text-white/70">“{heard}”</p>}
                {caption && <p className="mx-auto max-h-24 max-w-xl overflow-y-auto text-center text-sm leading-snug [text-shadow:0_1px_6px_rgba(0,0,0,.6)]">{caption}</p>}
                {(links.length > 0 || suggest.length > 0) && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggest.map((s) => <span key={s} className="max-w-full truncate rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">Say: “{s}”</span>)}
                    {links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6949ED]"><ExternalLink className="h-3 w-3" /> Open link</a>)}
                  </div>
                )}
                {blocked && (
                  <div className="mx-auto max-w-md rounded-2xl bg-white/95 p-3 text-center text-black shadow-xl">
                    <p className="mb-2 text-sm font-semibold">You are out of credits. Top up to continue ({sym})</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {TOPUPS.map((a) => <button key={a} disabled={topupBusy} onClick={() => topUp(a)} className="rounded-xl bg-[#6949ED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{sym}{a}</button>)}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); const n = Math.floor(Number(custom)); if (n >= 1) topUp(n); }} className="mt-2 flex items-center justify-center gap-2">
                      <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="Other amount" className="h-9 w-32 rounded-xl border border-gray-300 px-3 text-sm text-black" />
                      <button type="submit" disabled={topupBusy || !custom} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Pay</button>
                    </form>
                    <p className="mt-2 text-xs text-gray-500">Credits go to {linked ? `the number ending ${linked}` : 'your phone number'}, the same as on WhatsApp. After paying, tap below and keep talking.</p>
                    <button onClick={() => setBlocked(false)} className="mt-1 text-xs font-medium text-[#6949ED] underline">I have paid, continue</button>
                  </div>
                )}
                {error && <p className="mx-auto max-w-md rounded-xl bg-white/90 p-2 text-center text-xs text-red-700">{error}</p>}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button onClick={() => setMuted((m) => !m)} className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition ${muted ? 'bg-white text-gray-800' : 'bg-white/20 text-white hover:bg-white/30'}`} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
                  <button onClick={() => endConsult()} className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white shadow-lg hover:bg-red-700"><PhoneOff className="h-4 w-4" /> End</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Side panel ───────────────────────────────────── */}
        <aside className="min-w-0 space-y-3">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-black"><Coins className="h-4 w-4 text-[#6949ED]" /> Credits</div>
            <p className="mt-2 text-3xl font-bold text-[#6949ED]">{balance ?? '—'}</p>
            <p className="mt-1 text-xs text-gray-500">{linked ? `Linked to the number ending ${linked}, the same account as WhatsApp.` : 'Linked to the phone number on your profile, the same account as WhatsApp.'}</p>
            <p className="mt-2 text-xs text-gray-600">Each answer uses 5 credits (simple question) or 10 credits (health question).</p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-black"><Info className="h-4 w-4 text-[#6949ED]" /> Tips</div>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-700">
              <li>Speak normally and pause when you are done. The doctor answers after a short silence.</li>
              <li>You can interrupt at any time by speaking.</li>
              <li>Say “goodbye” to end the call.</li>
              <li>Use headphones in a noisy place for better hearing.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" /> Important</div>
            This is an AI doctor for guidance, not a replacement for an in-person or human doctor. In an emergency, call 112 straight away.
          </div>
        </aside>
      </div>
    </div>
  );
}
