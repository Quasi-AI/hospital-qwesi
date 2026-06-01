'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCheck, Search, Send, UserRound } from 'lucide-react';

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
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) || threads[0],
    [threads, selectedThreadId]
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

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'grid min-h-[660px] gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]'}>
      <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-base font-semibold text-slate-950">Conversations</h2>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search messages"
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No messages yet.</p>
          ) : (
            filteredThreads.map((thread) => {
              const last = thread.messages?.[thread.messages.length - 1];
              const other =
                thread.participants?.find((participant: Participant) => participantKey(participant) !== currentKey) ||
                thread.participants?.[0];
              const active = selectedThread?._id === thread._id;
              return (
                <button
                  key={thread._id}
                  type="button"
                  onClick={() => selectThread(thread)}
                  className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50 ${active ? 'bg-emerald-50' : ''}`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                    {other?.name?.charAt(0)?.toUpperCase() || 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">{other?.name || 'Conversation'}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{formatThreadTime(last?.createdAt || thread.lastMessageAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{last?.body || 'No message'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-[660px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#efeae2] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {otherParticipant?.name?.charAt(0)?.toUpperCase() || <UserRound className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-950">{otherParticipant?.name || 'New message'}</h3>
              <p className="truncate text-xs text-slate-500">
                {otherParticipant ? `${otherParticipant.role} conversation` : 'Choose a recipient or select a conversation'}
              </p>
            </div>
          </div>
          <select
            value={recipientKeyValue}
            onChange={(event) => setRecipientKeyValue(event.target.value)}
            className="h-9 w-44 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-60"
          >
            <option value="">{recipientScope === 'support' ? 'Choose support' : 'Choose recipient'}</option>
            {recipients.map((recipient) => (
              <option key={participantKey(recipient)} value={participantKey(recipient)}>
                {recipient.name} - {recipient.role}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-6">
          {!selectedThread ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-md bg-white/80 px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
                Select a conversation or choose a recipient to start messaging.
              </div>
            </div>
          ) : (
            selectedThread.messages?.map((message: any) => {
              const mine =
                currentKey &&
                message.senderType === currentParticipant?.entityType &&
                String(message.senderId) === String(currentParticipant?.entityId);
              return (
                <div key={message._id || message.createdAt} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[86%] rounded-lg px-3 py-2 shadow-sm sm:max-w-[70%] ${
                      mine
                        ? 'rounded-br-sm bg-[#d9fdd3] text-slate-950'
                        : 'rounded-bl-sm bg-white text-slate-950'
                    }`}
                  >
                    {!mine && <p className="mb-1 text-[11px] font-semibold text-emerald-700">{message.senderName}</p>}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {mine && <CheckCheck className="h-3.5 w-3.5 text-sky-600" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200 bg-[#f0f2f5] p-3">
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
              placeholder="Type a message"
              rows={1}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          <p className="mt-1 text-[11px] text-slate-500">
            Signed in as {session?.user?.name || currentParticipant?.name || 'current user'}.
          </p>
        </form>
      </section>
    </div>
  );
}
