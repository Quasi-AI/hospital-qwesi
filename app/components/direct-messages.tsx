'use client';


import { SkeletonLine } from '@/app/components/Skeletons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCheck, MessageSquarePlus, Search, Send, X } from 'lucide-react';

type Participant = {
  entityType: 'user' | 'patient';
  entityId: string;
  role: string;
  name: string;
  email?: string;
  image?: string;
};

function participantKey(participant?: Pick<Participant, 'entityType' | 'entityId'> | null) {
  if (!participant) return '';
  return `${participant.entityType}:${participant.entityId}`;
}

const AVATAR_COLORS = ['bg-violet-600', 'bg-fuchsia-600', 'bg-indigo-600', 'bg-sky-600', 'bg-teal-600', 'bg-rose-600', 'bg-amber-600'];
function avatarColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-11 w-11 text-base' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-12 w-12 text-sm';
  return (
    <div className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-semibold text-white ${avatarColor(name)}`}>
      {name?.trim()?.charAt(0)?.toUpperCase() || 'M'}
    </div>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  return (
    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-700">{role}</span>
  );
}

function dayLabel(value?: string | Date) {
  if (!value) return '';
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMessageTime(value?: string | Date) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatThreadTime(value?: string | Date) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatMessageTime(date);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function DirectMessages({
  compact = false,
  recipientScope,
}: {
  compact?: boolean;
  recipientScope?: 'support';
}) {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [recipientKeyValue, setRecipientKeyValue] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mobileChat, setMobileChat] = useState(false);
  const [composing, setComposing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) || (composing ? undefined : threads[0]),
    [threads, selectedThreadId, composing]
  );

  const currentKey = participantKey(currentParticipant);

  const otherParticipant = useMemo(() => {
    if (!selectedThread || !currentKey) return null;
    return selectedThread.participants?.find((participant: Participant) => participantKey(participant) !== currentKey) || null;
  }, [currentKey, selectedThread]);

  const filteredThreads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) => {
      const names = thread.participants?.map((participant: Participant) => participant.name).join(' ') || '';
      const last = thread.messages?.[thread.messages.length - 1]?.body || '';
      return `${names} ${last}`.toLowerCase().includes(needle);
    });
  }, [search, threads]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    const scopeQuery = recipientScope ? `?scope=${recipientScope}` : '';
    try {
      const [threadsRes, recipientsRes] = await Promise.all([
        fetch(`/api/messages${scopeQuery}`, { cache: 'no-store' }),
        fetch(`/api/messages/recipients${scopeQuery}`, { cache: 'no-store' }),
      ]);
      if (threadsRes.ok) {
        const data = await threadsRes.json();
        setThreads(data.threads || []);
        setCurrentParticipant(data.current || null);
      }
      if (recipientsRes.ok) setRecipients((await recipientsRes.json()).recipients || []);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [recipientScope]);

  useEffect(() => {
    load();

    const handleMessagesChanged = () => load({ silent: true });
    window.addEventListener('qwesi:messages-changed', handleMessagesChanged);

    const fallbackRefresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 10_000);

    return () => {
      window.removeEventListener('qwesi:messages-changed', handleMessagesChanged);
      window.clearInterval(fallbackRefresh);
    };
  }, [load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedThread?._id, selectedThread?.messages?.length]);

  const selectThread = (thread: any) => {
    setSelectedThreadId(thread._id);
    setComposing(false);
    setMobileChat(true);
    const other = thread.participants?.find((participant: Participant) => participantKey(participant) !== currentKey);
    setRecipientKeyValue(participantKey(other));
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const explicitRecipient = recipients.find((item) => participantKey(item) === recipientKeyValue);
    const recipient = explicitRecipient || otherParticipant;
    if (!recipient) {
      setError('Choose a recipient.');
      return;
    }
    if (!body.trim()) {
      setError('Write a message.');
      return;
    }

    const nextBody = body.trim();
    setSending(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEntityType: recipient.entityType,
        recipientId: recipient.entityId,
        body: nextBody,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const thread = data.thread;
      setBody('');
      if (thread?._id) {
        setThreads((previous) => [thread, ...previous.filter((item) => item._id !== thread._id)]);
        setSelectedThreadId(thread._id);
        setComposing(false);
        setRecipientKeyValue(participantKey(recipient));
      } else {
        await load({ silent: true });
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to send message.');
    }
    setSending(false);
  };

  const newRecipient = recipients.find((item) => participantKey(item) === recipientKeyValue);
  const headerPerson = composing ? newRecipient || null : otherParticipant;
  const showChat = mobileChat || composing;

  if (loading) {
    return (
      <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4 border-r border-slate-100 p-4">
          <SkeletonLine className="h-6 w-32" />
          <SkeletonLine className="h-10 w-full rounded-xl" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-3.5 w-2/3" />
                <SkeletonLine className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden bg-slate-50 lg:block" />
      </div>
    );
  }

  const messages: any[] = selectedThread?.messages || [];

  return (
    <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Conversation list */}
      <aside className={`${showChat ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-r border-slate-100`}>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Messages</h2>
            <button
              type="button"
              onClick={() => {
                setComposing(true);
                setSelectedThreadId('');
                setRecipientKeyValue('');
                setMobileChat(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <MessageSquarePlus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="h-10 w-full rounded-xl border border-transparent bg-slate-100 pl-9 pr-3 text-sm transition focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <MessageSquarePlus className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-500">Tap “New” to start a conversation.</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const last = thread.messages?.[thread.messages.length - 1];
              const other =
                thread.participants?.find((participant: Participant) => participantKey(participant) !== currentKey) ||
                thread.participants?.[0];
              const active = !composing && selectedThread?._id === thread._id;
              const mineLast = last && last.senderType === currentParticipant?.entityType && String(last.senderId) === String(currentParticipant?.entityId);
              return (
                <button
                  key={thread._id}
                  type="button"
                  onClick={() => selectThread(thread)}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${active ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                >
                  <Avatar name={other?.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">{other?.name || 'Conversation'}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{formatThreadTime(last?.createdAt || thread.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      {mineLast && <CheckCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
                      <p className="truncate">{last?.body || 'No messages'}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat pane */}
      <section className={`${showChat ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col bg-slate-50`}>
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => { setMobileChat(false); setComposing(false); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {composing ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">To:</span>
              <select
                value={recipientKeyValue}
                onChange={(event) => setRecipientKeyValue(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                <option value="">{recipientScope === 'support' ? 'Choose support' : 'Choose recipient'}</option>
                {recipients.map((recipient) => (
                  <option key={participantKey(recipient)} value={participantKey(recipient)}>
                    {recipient.name} — {recipient.role}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => { setComposing(false); setMobileChat(false); }} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel new message">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : headerPerson ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={headerPerson.name} size="lg" />
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-950">{headerPerson.name}</h3>
                <RoleBadge role={headerPerson.role} />
              </div>
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-slate-700">Select a conversation</h3>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-xs text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <MessageSquarePlus className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {composing || selectedThread ? 'Say hello 👋' : 'Your conversations'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {composing ? 'Pick a recipient above and write your first message.' : 'Select a conversation on the left or start a new one.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message: any, index: number) => {
                const mine =
                  currentKey &&
                  message.senderType === currentParticipant?.entityType &&
                  String(message.senderId) === String(currentParticipant?.entityId);
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                const sameSenderAsPrev = prev && !newDay && String(prev.senderId) === String(message.senderId);
                const lastOfGroup = !next || String(next.senderId) !== String(message.senderId) || new Date(next.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                return (
                  <div key={message._id || message.createdAt}>
                    {newDay && (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">{dayLabel(message.createdAt)}</span>
                      </div>
                    )}
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${sameSenderAsPrev ? '' : 'mt-3'}`}>
                      <div
                        className={`max-w-[85%] px-3.5 py-2 shadow-sm sm:max-w-[70%] ${
                          mine
                            ? 'rounded-2xl rounded-br-md bg-violet-600 text-white'
                            : 'rounded-2xl rounded-bl-md border border-slate-100 bg-white text-slate-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                        {lastOfGroup && (
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-violet-200' : 'text-slate-400'}`}>
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {mine && <CheckCheck className="h-3.5 w-3.5" />}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-3 pr-[4.75rem] sm:pr-3">
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Write a message…"
              rows={1}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
