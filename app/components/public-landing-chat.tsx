'use client';

import { useEffect, useRef, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { AutoLinkText } from './auto-link-text';

type ChatRole = 'user' | 'assistant';

export type PublicLandingChatMsg = { role: ChatRole; content: string };

const FALLBACK_WELCOME =
  'Hello — I can help with general questions about our services, visiting hours, and contact options based on this website. For emergencies, use your local emergency number right away.';

/** Short labels + fuller prompts sent to the assistant so visitors see what this chat can do. */
const DEFAULT_QUICK_ACTIONS: readonly { label: string; prompt: string }[] = [
  { label: 'Hours & location', prompt: 'What are your visiting hours, parking, and address?' },
  { label: 'Services', prompt: 'What services and departments do you offer? Summarize briefly.' },
  { label: 'Book an appointment', prompt: 'How can I book or request an appointment with a doctor?' },
  { label: 'Contact & emergencies', prompt: 'How do I reach you by phone or email? What should I do in a medical emergency?' },
];

export function PublicLandingChat({
  enabled,
  title,
  welcomeMessage,
  phoneDefaultCountry,
}: {
  enabled: boolean;
  title: string;
  welcomeMessage: string;
  /** Helps detect national-format phone numbers in replies (e.g. organisation country). */
  phoneDefaultCountry?: CountryCode;
}) {
  const welcome = welcomeMessage.trim() || FALLBACK_WELCOME;
  const panelTitle = title.trim() || 'Ask us';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  /** True for the whole assistant request (including streaming). */
  const [busy, setBusy] = useState(false);
  /** True until the first streamed token (or full reply for non-streaming). */
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicLandingChatMsg[]>([{ role: 'assistant', content: welcome }]);

  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: welcome }]);
    setError(null);
    setInput('');
  }, [welcome]);

  useEffect(() => {
    if (!open) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, busy, waitingFirstToken]);

  if (!enabled) return null;

  const showQuickActions = !messages.some((m) => m.role === 'user');

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || busy) return;

    const payload: PublicLandingChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages([...payload, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    setWaitingFirstToken(true);
    setError(null);

    try {
      const res = await fetch('/api/public/landing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload, stream: true }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === 'string' ? data.error : 'Assistant unavailable.');
      }

      const ct = res.headers.get('content-type') || '';

      if (ct.includes('ndjson') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuf = '';
        let assistant = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuf += decoder.decode(value, { stream: true });
          const lines = lineBuf.split('\n');
          lineBuf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            let ev: { type?: string; text?: string; message?: string };
            try {
              ev = JSON.parse(line) as { type?: string; text?: string; message?: string };
            } catch {
              continue;
            }
            if (ev.type === 'error') {
              throw new Error(typeof ev.message === 'string' ? ev.message : 'Assistant error.');
            }
            if (ev.type === 'token' && typeof ev.text === 'string' && ev.text) {
              assistant += ev.text;
              setWaitingFirstToken(false);
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { role: 'assistant', content: assistant };
                }
                return next;
              });
            }
          }
        }

        if (lineBuf.trim()) {
          try {
            const ev = JSON.parse(lineBuf.trim()) as { type?: string; text?: string; message?: string };
            if (ev.type === 'error') {
              throw new Error(typeof ev.message === 'string' ? ev.message : 'Assistant error.');
            }
            if (ev.type === 'token' && typeof ev.text === 'string' && ev.text) {
              assistant += ev.text;
              setWaitingFirstToken(false);
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { role: 'assistant', content: assistant };
                }
                return next;
              });
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              /* ignore incomplete trailing JSON */
            } else {
              throw e;
            }
          }
        }

        const trimmed = assistant.trim();
        if (!trimmed) throw new Error('Empty reply from assistant.');
        setMessages([...payload, { role: 'assistant', content: trimmed }]);
      } else {
        const data = (await res.json()) as { reply?: string; error?: string };
        setWaitingFirstToken(false);
        if (typeof data.reply !== 'string' || !data.reply.trim()) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Empty reply from assistant.');
        }
        setMessages([...payload, { role: 'assistant', content: data.reply.trim() }]);
      }
    } catch (e) {
      setMessages(payload);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      setWaitingFirstToken(false);
    }
  };

  const send = () => void sendMessage(input);

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[60] flex flex-col items-end gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div
        id="public-landing-chat-panel"
        className={`pointer-events-auto flex max-h-[min(420px,calc(100dvh-8rem))] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl bg-gray-50 text-gray-900 shadow-xl shadow-gray-900/12 transition-[opacity,transform] duration-200 ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={panelTitle}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200/90 bg-gradient-to-r from-teal-900 to-teal-800 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
              <MessageCircle className="h-4 w-4 text-teal-100" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{panelTitle}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-teal-200/90">
                Website assistant
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-teal-100 transition hover:bg-white/15 hover:text-white"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
          <div className="custom-scrollbar max-h-[min(260px,42dvh)] space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              if (m.role === 'assistant' && !m.content && busy && waitingFirstToken) {
                return null;
              }
              const streamingAssistant = m.role === 'assistant' && isLast && busy;
              return (
              <div
                key={`msg-${i}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-sm'
                      : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 shadow-sm [&_p]:text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-inherit">
                    {streamingAssistant ? (
                      m.content || '\u200b'
                    ) : (
                    <AutoLinkText
                      text={m.content}
                      phoneDefaultCountry={phoneDefaultCountry}
                      linkClassName={
                        m.role === 'user'
                          ? 'font-medium text-white underline decoration-white/70 underline-offset-2 hover:decoration-white break-all'
                          : 'font-medium text-teal-700 underline decoration-teal-600/45 underline-offset-2 hover:text-teal-900 break-all'
                      }
                    />
                    )}
                  </p>
                </div>
              </div>
              );
            })}
            {busy && waitingFirstToken ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-gray-600 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden />
                  <span className="text-xs">Thinking…</span>
                </div>
              </div>
            ) : null}
            <div ref={listEndRef} />
          </div>

          {error ? (
            <div className="mx-3 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950">
              {error}
            </div>
          ) : null}

          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2.5">
            {showQuickActions ? (
              <div className="mb-2.5">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Popular topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      disabled={busy}
                      onClick={() => void sendMessage(action.prompt)}
                      className="rounded-full border border-teal-200/90 bg-white px-2.5 py-1 text-[11px] font-semibold leading-tight text-teal-900 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:pointer-events-none disabled:opacity-45"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Type a question…"
                disabled={busy}
                className="custom-scrollbar min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:opacity-60"
                aria-label="Message"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className="flex h-[44px] w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-900/40 transition hover:from-teal-400 hover:to-cyan-500 disabled:pointer-events-none disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-gray-500">
              Informational only — not medical advice. Doctor suggestions use live directory &amp; booking data and may
              lag real-time availability; confirm on the appointment page. Emergencies require local emergency services.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-teal-700/40 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f8f7]"
        aria-expanded={open}
        aria-controls="public-landing-chat-panel"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
        <span>{panelTitle}</span>
      </button>
    </div>
  );
}
