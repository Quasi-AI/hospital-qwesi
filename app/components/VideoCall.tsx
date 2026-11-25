'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaConnection, Peer as PeerType } from 'peerjs';
import {
  Lock,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  RefreshCw,
  SwitchCamera,
  Video,
  VideoOff,
  Volume2,
  Zap,
} from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  participantName: string;
  participantRole: 'doctor' | 'patient';
  /** 'audio' = voice call (no camera), 'video' = video call. */
  mode?: 'video' | 'audio';
  /** Name shown for the other person. */
  remoteName?: string;
  sessionStatus?: string;
  onCallEnd?: () => void;
}

type Phase = 'media' | 'connecting' | 'waiting' | 'live' | 'reconnecting' | 'ended' | 'error';
type Quality = 'good' | 'fair' | 'poor' | null;

/**
 * Free STUN servers plus a TURN relay. Without TURN, calls fail behind strict mobile networks and office
 * firewalls. Set NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL for your own relay; until then a public
 * shared relay is used as a fallback.
 */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const url = process.env.NEXT_PUBLIC_TURN_URL;
  if (url) {
    servers.push({
      urls: url.split(',').map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  } else {
    servers.push({
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }
  return servers;
}

function peerOptions() {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  return {
    debug: 0,
    ...(host
      ? {
          host,
          port: Number(process.env.NEXT_PUBLIC_PEER_PORT || 443),
          path: process.env.NEXT_PUBLIC_PEER_PATH || '/',
          secure: process.env.NEXT_PUBLIC_PEER_SECURE !== 'false',
        }
      : {}),
    config: { iceServers: iceServers(), iceCandidatePoolSize: 4 },
  };
}

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

export default function VideoCall({
  roomId,
  participantName,
  participantRole,
  mode = 'video',
  remoteName,
  sessionStatus,
  onCallEnd,
}: VideoCallProps) {
  const isAudio = mode === 'audio';
  const otherRole = participantRole === 'doctor' ? 'patient' : 'doctor';
  const otherName = remoteName || (otherRole === 'doctor' ? 'Your doctor' : 'Your patient');

  const [phase, setPhase] = useState<Phase>('media');
  const [status, setStatus] = useState('Getting your microphone ready…');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!isAudio);
  const [cameraMissing, setCameraMissing] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lowData, setLowData] = useState(false);
  const [quality, setQuality] = useState<Quality>(null);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [toast, setToast] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const peerRef = useRef<PeerType | null>(null);
  const lowDataRef = useRef(false);
  const facingRef = useRef<'user' | 'environment'>('user');
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const actions = useRef<{ hangUp: () => void; applyBitrate: (low: boolean) => void; flip: () => void; share: () => void }>({
    hangUp: () => {},
    applyBitrate: () => {},
    flip: () => {},
    share: () => {},
  });
  const onEndRef = useRef(onCallEnd);
  onEndRef.current = onCallEnd;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 3500);
  }, []);

  useEffect(() => {
    let disposed = false;
    let dial: number | undefined;
    let statsTimer: number | undefined;
    let clock: number | undefined;
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let wake: any = null;
    let lastLost = 0;
    let lastRecv = 0;
    let poorStreak = 0;
    let startedAt = 0;
    let dialStarted = 0;
    let idRetries = 0;
    let netRetries = 0;

    const sanitized = roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    const myId = `hms${sanitized}${participantRole}`;
    const targetId = `hms${sanitized}${otherRole}`;

    setPhase('media');
    setStatus('Getting your microphone ready…');
    setError('');
    setSeconds(0);
    setQuality(null);

    const stopMeters = () => {
      if (statsTimer) window.clearInterval(statsTimer);
      statsTimer = undefined;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      try { audioCtx?.close(); } catch { /* ignore */ }
      audioCtx = null;
      setLevel(0);
    };

    const startMeters = (remote: MediaStream) => {
      stopMeters();
      // How loud the other person is: drives the animated rings on voice calls.
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new Ctx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        audioCtx.createMediaStreamSource(remote).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let last = 0;
        const tick = (t: number) => {
          raf = requestAnimationFrame(tick);
          if (t - last < 80) return;
          last = t;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) { const v = (data[i] - 128) / 128; sum += v * v; }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
        };
        raf = requestAnimationFrame(tick);
      } catch { /* the call works without the meter */ }

      // Connection quality from round-trip time and packet loss.
      statsTimer = window.setInterval(async () => {
        const pc = callRef.current?.peerConnection;
        if (!pc) return;
        try {
          const report = await pc.getStats();
          let rtt: number | null = null;
          let lost = 0;
          let recv = 0;
          report.forEach((r: any) => {
            if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded' && typeof r.currentRoundTripTime === 'number') rtt = r.currentRoundTripTime * 1000;
            if (r.type === 'inbound-rtp' && !r.isRemote) { lost += r.packetsLost || 0; recv += r.packetsReceived || 0; }
          });
          const dLost = Math.max(0, lost - lastLost);
          const dRecv = Math.max(0, recv - lastRecv);
          lastLost = lost; lastRecv = recv;
          const loss = dLost + dRecv > 0 ? dLost / (dLost + dRecv) : 0;
          const q: Quality = (rtt ?? 0) > 400 || loss > 0.08 ? 'poor' : (rtt ?? 0) > 200 || loss > 0.03 ? 'fair' : 'good';
          setQuality(q);
          poorStreak = q === 'poor' ? poorStreak + 1 : 0;
          // A weak connection: drop to low-data video automatically so the call keeps flowing.
          if (poorStreak >= 2 && !lowDataRef.current && !isAudio) {
            lowDataRef.current = true;
            setLowData(true);
            applyBitrate(true);
            flash('Weak connection: switched to low-data mode');
          }
        } catch { /* ignore */ }
      }, 3000);
    };

    const applyBitrate = (low: boolean) => {
      const pc = callRef.current?.peerConnection;
      if (!pc) return;
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind !== 'video') return;
        try {
          const params = sender.getParameters();
          if (!params.encodings || !params.encodings.length) params.encodings = [{}];
          if (low) { params.encodings[0].maxBitrate = 150_000; params.encodings[0].scaleResolutionDownBy = 2; }
          else { delete params.encodings[0].maxBitrate; params.encodings[0].scaleResolutionDownBy = 1; }
          sender.setParameters(params).catch(() => {});
        } catch { /* not supported on this browser */ }
      });
    };

    const attachRemote = (remote: MediaStream) => {
      const el = remoteRef.current;
      if (el) {
        el.srcObject = remote;
        el.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
      }
      if (!startedAt) {
        startedAt = Date.now();
        clock = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
      }
      setPhase('live');
      setStatus('Connected');
      setError('');
      lastLost = 0; lastRecv = 0; poorStreak = 0;
      startMeters(remote);
      if (lowDataRef.current) applyBitrate(true);
    };

    const remoteGone = () => {
      callRef.current = null;
      stopMeters();
      setQuality(null);
      setPhase('waiting');
      setStatus(`${otherName} left the call. Waiting for them to rejoin…`);
    };

    const wire = (c: MediaConnection) => {
      if (callRef.current && callRef.current !== c) { try { callRef.current.close(); } catch { /* ignore */ } }
      callRef.current = c;
      c.on('stream', attachRemote);
      c.on('close', () => { if (callRef.current === c && !disposed) remoteGone(); });
      c.on('error', () => { if (callRef.current === c) callRef.current = null; });
      try {
        const pc = c.peerConnection;
        pc?.addEventListener('iceconnectionstatechange', () => {
          if (callRef.current !== c) return;
          const s = pc.iceConnectionState;
          if (s === 'disconnected') { setPhase('reconnecting'); setStatus('Connection unstable. Reconnecting…'); }
          if (s === 'connected' || s === 'completed') { setPhase('live'); setStatus('Connected'); }
          if (s === 'failed') {
            try { pc.restartIce(); } catch { /* ignore */ }
            setPhase('reconnecting');
            setStatus('Connection lost. Trying to restore…');
            window.setTimeout(() => { if (callRef.current === c && pc.iceConnectionState === 'failed') { try { c.close(); } catch { /* ignore */ } callRef.current = null; } }, 8000);
          }
        });
      } catch { /* ignore */ }
    };

    const getMedia = async (): Promise<MediaStream> => {
      const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      if (isAudio) return navigator.mediaDevices.getUserMedia({ audio });
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
        });
      } catch {
        // No camera, or camera blocked: carry on as a voice call instead of failing.
        const voiceOnly = await navigator.mediaDevices.getUserMedia({ audio });
        setCameraMissing(true);
        setCamOn(false);
        return voiceOnly;
      }
    };

    const startPeer = async () => {
      setPhase('connecting');
      setStatus('Connecting securely…');
      const mod: any = await import('peerjs');
      if (disposed) return;
      const PeerCtor = mod.Peer || mod.default;
      const peer: PeerType = new PeerCtor(myId, peerOptions());
      peerRef.current = peer;

      peer.on('open', () => {
        if (disposed) return;
        setPhase('waiting');
        setStatus(`Waiting for ${otherName} to join…`);
        // The doctor places the call (and keeps trying until it is answered); the patient only answers.
        if (participantRole === 'doctor') {
          const tryDial = () => {
            if (disposed || !peer || peer.destroyed || peer.disconnected || !streamRef.current) return;
            const existing = callRef.current;
            if (existing) {
              if (Date.now() - dialStarted > 14_000 && !startedAt) { try { existing.close(); } catch { /* ignore */ } callRef.current = null; }
              else return;
            }
            dialStarted = Date.now();
            wire(peer.call(targetId, streamRef.current));
          };
          tryDial();
          dial = window.setInterval(tryDial, 2500);
        }
      });

      peer.on('call', (c) => {
        if (disposed || !streamRef.current) return;
        c.answer(streamRef.current);
        wire(c);
      });

      peer.on('disconnected', () => { if (!disposed && !peer.destroyed) peer.reconnect(); });

      peer.on('error', (err: any) => {
        if (disposed) return;
        if (err.type === 'peer-unavailable') {
          callRef.current = null;
          setPhase((p) => (p === 'live' ? p : 'waiting'));
          setStatus(`Waiting for ${otherName} to join…`);
        } else if (err.type === 'unavailable-id') {
          // An earlier tab or session still holds this ID; it frees itself within seconds.
          idRetries += 1;
          if (idRetries > 8) { setPhase('error'); setError('This consultation is already open in another tab or device. Close it there and try again.'); return; }
          setStatus('Reconnecting…');
          try { peer.destroy(); } catch { /* ignore */ }
          window.setTimeout(() => { if (!disposed) startPeer().catch(() => {}); }, 1500);
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
          netRetries += 1;
          if (netRetries > 6) { setPhase('error'); setError('We cannot reach the call service. Check your internet connection and try again.'); try { peer.destroy(); } catch { /* ignore */ } return; }
          setStatus('Network issue. Reconnecting…');
          try { peer.destroy(); } catch { /* ignore */ }
          window.setTimeout(() => { if (!disposed) startPeer().catch(() => {}); }, 2000);
        } else if (err.type === 'browser-incompatible') {
          setPhase('error');
          setError('This browser cannot make calls. Please use the latest Chrome, Edge, Safari or Firefox.');
        }
      });
    };

    const teardown = () => {
      disposed = true;
      if (dial) window.clearInterval(dial);
      if (clock) window.clearInterval(clock);
      stopMeters();
      try { callRef.current?.close(); } catch { /* ignore */ }
      callRef.current = null;
      try { peerRef.current?.destroy(); } catch { /* ignore */ }
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenTrackRef.current?.stop();
      streamRef.current = null;
      screenTrackRef.current = null;
      try { wake?.release?.(); } catch { /* ignore */ }
    };

    actions.current.applyBitrate = applyBitrate;
    actions.current.hangUp = () => {
      teardown();
      setPhase('ended');
      setStatus('Call ended');
      onEndRef.current?.();
    };

    const replaceVideoTrack = async (track: MediaStreamTrack) => {
      const pc = callRef.current?.peerConnection;
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track).catch(() => {});
      const stream = streamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
        stream.addTrack(track);
        if (localRef.current) localRef.current.srcObject = stream;
      }
    };

    actions.current.flip = async () => {
      try {
        facingRef.current = facingRef.current === 'user' ? 'environment' : 'user';
        const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingRef.current }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        const track = next.getVideoTracks()[0];
        camTrackRef.current?.stop();
        camTrackRef.current = track;
        await replaceVideoTrack(track);
      } catch { flash('Could not switch camera'); }
    };

    actions.current.share = async () => {
      try {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
          if (camTrackRef.current) await replaceVideoTrack(camTrackRef.current);
          setSharing(false);
          return;
        }
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const track: MediaStreamTrack = screen.getVideoTracks()[0];
        screenTrackRef.current = track;
        await replaceVideoTrack(track);
        setSharing(true);
        track.onended = () => {
          screenTrackRef.current = null;
          if (camTrackRef.current && !disposed) replaceVideoTrack(camTrackRef.current);
          setSharing(false);
        };
      } catch { /* the person closed the picker */ }
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await getMedia();
        if (disposed) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        camTrackRef.current = stream.getVideoTracks()[0] || null;
        if (localRef.current) localRef.current.srcObject = stream;
        setMicOn(true);
        if (!isAudio) {
          try {
            const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
            setCanFlip(cams.length > 1);
          } catch { /* ignore */ }
        }
        try { wake = await (navigator as any).wakeLock?.request('screen'); } catch { /* optional */ }
        await startPeer();
      } catch (e: any) {
        if (disposed) return;
        setPhase('error');
        setError(
          e?.message === 'unsupported'
            ? 'This browser cannot make calls. Please use the latest Chrome, Edge, Safari or Firefox over a secure (https) connection.'
            : isAudio
              ? 'We could not use your microphone. Allow microphone access in your browser, then try again.'
              : 'We could not use your microphone or camera. Allow access in your browser, then try again.'
        );
      }
    })();

    const onUnload = () => { try { peerRef.current?.destroy(); } catch { /* ignore */ } };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, participantRole, mode, attempt]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleMic = () => {
    const t = streamRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  };
  const toggleCam = () => {
    const t = streamRef.current?.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setCamOn(t.enabled);
  };
  const toggleLow = () => {
    const next = !lowData;
    lowDataRef.current = next;
    setLowData(next);
    actions.current.applyBitrate(next);
    flash(next ? 'Low-data mode on' : 'Low-data mode off');
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };
  const enableSound = () => remoteRef.current?.play().then(() => setSoundBlocked(false)).catch(() => {});

  const live = phase === 'live' || (phase === 'reconnecting' && seconds > 0);
  const showRemoteVideo = !isAudio && phase === 'live';
  const initial = otherName.replace(/^Dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || '•';
  const ring = 1 + level * 0.9;
  const barCls = (n: number) => {
    const on = quality === 'good' ? 3 : quality === 'fair' ? 2 : quality === 'poor' ? 1 : 0;
    const color = quality === 'poor' ? 'bg-rose-400' : quality === 'fair' ? 'bg-amber-300' : 'bg-emerald-400';
    return `w-1 rounded-sm ${n <= on ? color : 'bg-white/25'}`;
  };

  const ctrl = 'inline-flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition active:scale-95 sm:h-14 sm:w-14';
  const ctrlOff = 'bg-white text-slate-900 hover:bg-slate-100';
  const ctrlOn = 'bg-white/15 text-white hover:bg-white/25';

  return (
    <div ref={rootRef} className="relative h-full min-h-[320px] w-full select-none overflow-hidden bg-slate-950 text-white">
      {/* Remote picture / sound */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showRemoteVideo ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Voice call / waiting backdrop */}
      {!showRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#4c1d95_0%,_#1e1b4b_45%,_#020617_100%)] px-6 text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            {phase !== 'error' && phase !== 'ended' && (
              <>
                <span className="absolute inset-0 rounded-full bg-violet-400/20 transition-transform duration-150" style={{ transform: `scale(${live ? ring : 1})` }} />
                {!live && <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />}
                <span className="absolute inset-4 rounded-full bg-violet-400/25 transition-transform duration-150" style={{ transform: `scale(${live ? 1 + level * 0.5 : 1})` }} />
              </>
            )}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-4xl font-semibold shadow-2xl ring-4 ring-white/10">
              {phase === 'ended' ? <PhoneOff className="h-10 w-10" /> : initial}
            </div>
          </div>
          <h3 className="mt-6 text-xl font-semibold">{phase === 'ended' ? 'Call ended' : otherName}</h3>
          <p className="mt-1 max-w-sm text-sm text-white/70">
            {phase === 'error' ? error : phase === 'ended' ? (seconds > 0 ? `Duration ${fmt(seconds)}` : 'You left the call.') : live && isAudio ? `${isAudio ? 'Voice call' : ''} · ${fmt(seconds)}` : status}
          </p>
          {(phase === 'media' || phase === 'connecting') && <RefreshCw className="mt-5 h-5 w-5 animate-spin text-white/60" />}
          {phase === 'waiting' && <p className="mt-5 max-w-xs text-xs text-white/50">Keep this page open. The call starts the moment {otherName} joins.</p>}
          {(phase === 'error' || (phase === 'ended' && sessionStatus !== 'completed')) && (
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-lg hover:bg-slate-100">
              <RefreshCw className="h-4 w-4" /> {phase === 'ended' ? 'Rejoin call' : 'Try again'}
            </button>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-3 sm:p-4">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-xs backdrop-blur">
          <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span className="truncate font-medium">{otherName}</span>
          <span className="hidden text-white/50 sm:inline">· encrypted call</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {live && (
            <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 font-mono text-xs backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" /></span>
              {fmt(seconds)}
            </div>
          )}
          {live && quality && (
            <div className="flex h-7 items-end gap-0.5 rounded-full bg-black/35 px-2.5 pb-1.5 pt-2 backdrop-blur" title={`Connection: ${quality}`}>
              <span className={`${barCls(1)} h-1.5`} /><span className={`${barCls(2)} h-2.5`} /><span className={`${barCls(3)} h-3.5`} />
            </div>
          )}
          <button type="button" onClick={toggleFullscreen} className="hidden h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur hover:bg-black/55 sm:inline-flex" aria-label="Fullscreen">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Self view */}
      {!isAudio && !cameraMissing && (
        <div className="absolute bottom-28 right-3 h-36 w-24 overflow-hidden rounded-2xl bg-slate-800 shadow-2xl ring-1 ring-white/20 sm:bottom-32 sm:right-4 sm:h-32 sm:w-48">
          <video ref={localRef} autoPlay muted playsInline className={`h-full w-full object-cover ${facingRef.current === 'user' && !sharing ? '-scale-x-100' : ''} ${camOn ? '' : 'invisible'}`} />
          {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><VideoOff className="h-6 w-6 text-white/50" /></div>}
          <span className="absolute bottom-1.5 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px]">{sharing ? 'Sharing screen' : participantName.split(' ')[0] || 'You'}</span>
        </div>
      )}

      {/* Toast & sound prompt */}
      {toast && <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs backdrop-blur">{toast}</div>}
      {soundBlocked && phase === 'live' && (
        <button type="button" onClick={enableSound} className="absolute left-1/2 top-28 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg">
          <Volume2 className="h-4 w-4" /> Tap to turn sound on
        </button>
      )}
      {cameraMissing && !isAudio && phase !== 'ended' && phase !== 'error' && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-amber-400/90 px-4 py-1.5 text-xs font-medium text-slate-900">Camera unavailable. Continuing as a voice call.</div>
      )}

      {/* Controls */}
      {phase !== 'ended' && phase !== 'error' && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-3 pb-4 pt-10 sm:pb-6">
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4">
            <button type="button" onClick={toggleMic} className={`${ctrl} ${micOn ? ctrlOn : ctrlOff}`} aria-label={micOn ? 'Mute' : 'Unmute'} title={micOn ? 'Mute' : 'Unmute'}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            {!isAudio && !cameraMissing && (
              <button type="button" onClick={toggleCam} className={`${ctrl} ${camOn ? ctrlOn : ctrlOff}`} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'} title={camOn ? 'Turn camera off' : 'Turn camera on'}>
                {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            )}
            {!isAudio && canFlip && (
              <button type="button" onClick={() => actions.current.flip()} className={`${ctrl} ${ctrlOn}`} aria-label="Switch camera" title="Switch camera">
                <SwitchCamera className="h-5 w-5" />
              </button>
            )}
            {!isAudio && typeof navigator !== 'undefined' && (navigator.mediaDevices as any)?.getDisplayMedia && participantRole === 'doctor' && (
              <button type="button" onClick={() => actions.current.share()} className={`${ctrl} hidden sm:inline-flex ${sharing ? ctrlOff : ctrlOn}`} aria-label="Share screen" title="Share screen">
                <MonitorUp className="h-5 w-5" />
              </button>
            )}
            {!isAudio && (
              <button type="button" onClick={toggleLow} className={`${ctrl} ${lowData ? ctrlOff : ctrlOn}`} aria-label="Low-data mode" title="Low-data mode (saves mobile data)">
                <Zap className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={() => actions.current.hangUp()} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold shadow-lg transition hover:bg-rose-500 active:scale-95 sm:h-14 sm:px-7" aria-label="End call">
              <PhoneOff className="h-5 w-5" /> <span className="hidden sm:inline">End</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
