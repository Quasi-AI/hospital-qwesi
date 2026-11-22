'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, Camera, ShieldAlert, Loader2, ExternalLink } from 'lucide-react';

type Phase = 'idle' | 'starting' | 'listening' | 'thinking' | 'speaking' | 'blocked' | 'ended';
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
  const [muted, setMuted] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);

  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const refs = useRef({ phase: 'idle' as Phase, muted: false, avatarReady: false, speaking: false, endAfter: false, stream: null as MediaStream | null, ctx: null as AudioContext | null, lookTimer: 0 as any, cleanup: () => {} });
  const setPh = (p: Phase) => { refs.current.phase = p; setPhase(p); };

  useEffect(() => { fetch('/api/ai-doctor/config').then((r) => r.json()).then(setCfg).catch(() => setCfg({ enabled: false, avatarUrl: '', doctorName: '', cameraEnabled: false })); }, []);
  useEffect(() => { refs.current.muted = muted; }, [muted]);

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
      if (r.blocked) setPh('blocked');
      play(r);
      if (!r.audio) setPh(r.blocked ? 'blocked' : 'listening');
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
      setBalance(s.balance);
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
  const status = { idle: '', starting: 'Connecting…', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…', blocked: 'Out of credits', ended: 'Consultation ended' }[phase];

  if (!cfg) return <div className="p-8 text-center text-sm text-gray-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;
  if (!cfg.enabled) return (
    <div className="mx-auto max-w-lg p-6 sm:p-10">
      <div className="rounded-3xl border border-white/60 bg-white/70 p-8 text-center shadow-xl backdrop-blur-xl">
        <Video className="mx-auto mb-3 h-8 w-8 text-[#6949ED]" />
        <h1 className="text-xl font-semibold text-black">My AI Doctor</h1>
        <p className="mt-2 text-sm text-gray-600">The video consultation is not available yet. Please check back soon.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl p-3 sm:p-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-b from-[#6949ED]/90 to-[#2a1a6e] shadow-2xl" style={{ height: 'min(78vh, 720px)' }}>
        <iframe ref={frame} src="/ai-doctor/avatar.html" title={cfg.doctorName} allow="autoplay" className="absolute inset-0 h-full w-full border-0" />
        <video ref={video} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 text-xs text-white">
          <span className="rounded-full bg-black/35 px-3 py-1 backdrop-blur">{cfg.doctorName} · AI</span>
          <span className="flex items-center gap-2">
            {cameraOn && <span className="flex items-center gap-1 rounded-full bg-black/35 px-3 py-1 backdrop-blur"><Camera className="h-3 w-3" /> Camera on</span>}
            {balance !== null && <span className="rounded-full bg-black/35 px-3 py-1 backdrop-blur">{balance} credits</span>}
          </span>
        </div>

        {urgent && (
          <div className="absolute inset-x-3 top-14 flex items-start gap-2 rounded-2xl bg-red-600/95 p-3 text-sm text-white shadow-lg">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> This may be an emergency. Call your local emergency number now (112 in Ghana).
          </div>
        )}

        {/* captions + chips */}
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/70 to-transparent p-3 pt-16 text-white">
          {status && <div className="text-center text-xs uppercase tracking-wide text-white/80">{status}</div>}
          {heard && <p className="text-center text-xs italic text-white/70">“{heard}”</p>}
          {caption && <p className="mx-auto max-w-xl text-center text-sm leading-snug">{caption}</p>}
          {(links.length > 0 || suggest.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2">
              {suggest.map((s) => <span key={s} className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">Say: “{s}”</span>)}
              {links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6949ED]"><ExternalLink className="h-3 w-3" /> Open link</a>)}
            </div>
          )}
          {phase === 'blocked' && (
            <div className="rounded-2xl bg-white/95 p-3 text-center text-black">
              <p className="mb-2 text-sm font-medium">Choose an amount to top up (GH₵)</p>
              <div className="flex flex-wrap justify-center gap-2">
                {TOPUPS.map((a) => <button key={a} disabled={topupBusy} onClick={() => topUp(a)} className="rounded-xl bg-[#6949ED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">GH₵{a}</button>)}
              </div>
              <p className="mt-2 text-xs text-gray-500">After paying, just keep talking. Your credits are added automatically.</p>
              <button onClick={() => setPh('listening')} className="mt-1 text-xs text-[#6949ED] underline">I have paid, continue</button>
            </div>
          )}
          {error && <p className="rounded-xl bg-white/90 p-2 text-center text-xs text-red-700">{error}</p>}
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-xl backdrop-blur-xl">
        {!live ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {cfg.cameraEnabled && (
              <label className="flex max-w-md cursor-pointer items-start gap-2 text-left text-sm text-gray-700">
                <input type="checkbox" checked={useCamera} onChange={(e) => setUseCamera(e.target.checked)} className="mt-1 accent-[#6949ED]" />
                <span>Let the doctor see me through my camera. A small picture is analysed now and then for visible signs such as tiredness or a rash. It is never saved, and it is not a diagnosis.</span>
              </label>
            )}
            <button onClick={startConsult} className="flex items-center gap-2 rounded-2xl bg-[#6949ED] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90"><Video className="h-4 w-4" /> {phase === 'ended' ? 'Start another consultation' : 'Start video consultation'}</button>
            <p className="max-w-md text-xs text-gray-500">This is an AI doctor for guidance, not a replacement for an in-person or human doctor. Each answer uses credits (5 for simple questions, 10 for health questions). In an emergency call 112.</p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setMuted((m) => !m)} className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? 'bg-gray-200 text-gray-700' : 'bg-[#6949ED] text-white'}`} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
            <button onClick={() => endConsult()} className="flex h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white"><PhoneOff className="h-4 w-4" /> End</button>
          </div>
        )}
      </div>
    </div>
  );
}
