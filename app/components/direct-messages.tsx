'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, UserRound } from 'lucide-react';

export function DirectMessages({ compact = false }: { compact?: boolean }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [recipientKey, setRecipientKey] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) || threads[0],
    [threads, selectedThreadId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [threadsRes, recipientsRes] = await Promise.all([fetch('/api/messages'), fetch('/api/messages/recipients')]);
    if (threadsRes.ok) setThreads((await threadsRes.json()).threads || []);
    if (recipientsRes.ok) setRecipients((await recipientsRes.json()).recipients || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('qwesi:messages-changed', load);
    return () => window.removeEventListener('qwesi:messages-changed', load);
  }, [load]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const recipient = recipients.find((item) => `${item.entityType}:${item.entityId}` === recipientKey);
    if (!recipient) {
      setError('Choose a recipient.');
      return;
    }
    if (!body.trim()) {
      setError('Write a message.');
      return;
    }
    setSending(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEntityType: recipient.entityType,
        recipientId: recipient.entityId,
        body,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setBody('');
      await load();
      setSelectedThreadId(data.thread?._id || '');
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
    <div className={compact ? 'space-y-4' : 'grid min-h-[620px] gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]'}>
      <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-base font-semibold text-slate-950">Conversations</h2>
          <p className="text-xs text-slate-500">Doctors, staff, and patients connected to care.</p>
        </div>
        <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No messages yet.</p>
          ) : (
            threads.map((thread) => {
              const last = thread.messages?.[thread.messages.length - 1];
              const title = thread.participants?.map((p: any) => p.name).join(' / ');
              const active = selectedThread?._id === thread._id;
              return (
                <button
                  key={thread._id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread._id)}
                  className={`block w-full p-3 text-left transition hover:bg-slate-50 ${active ? 'bg-blue-50' : ''}`}
                >
                  <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{last?.body || 'No message'}</p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-[620px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <form onSubmit={sendMessage} className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_auto]">
            <select
              value={recipientKey}
              onChange={(e) => setRecipientKey(e.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="">Choose recipient</option>
              {recipients.map((recipient) => (
                <option key={`${recipient.entityType}:${recipient.entityId}`} value={`${recipient.entityType}:${recipient.entityId}`}>
                  {recipient.name} - {recipient.role}
                </option>
              ))}
            </select>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a direct message"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </form>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!selectedThread ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a conversation or send a new message.</div>
          ) : (
            selectedThread.messages?.map((message: any) => (
              <div key={message._id || message.createdAt} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  <span className="font-semibold text-slate-700">{message.senderName}</span>
                  <span>{new Date(message.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{message.body}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
