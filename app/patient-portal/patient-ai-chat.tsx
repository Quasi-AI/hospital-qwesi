'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Bot,
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Pill,
  Plus,
  Send,
  Stethoscope,
  UserRound,
} from 'lucide-react';

type ChatRole = 'assistant' | 'user';

type RecommendedDoctor = {
  id: string;
  name: string;
  specialization: string;
  reason: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  doctors?: RecommendedDoctor[];
};

const starterPrompts = [
  'I have a fever and headache. What should I do next?',
  'Which doctor should I see for chest discomfort?',
  'Can I ask about medication side effects?',
];

const careLinks = [
  { label: 'Book appointment', href: '/patient-portal/appointments/new', icon: Calendar },
  { label: 'Find doctors', href: '/patient-portal/doctors', icon: Stethoscope },
  { label: 'Prescriptions', href: '/patient-portal/prescriptions', icon: Pill },
  { label: 'Reports', href: '/patient-portal/reports', icon: FileText },
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I am your Qwesi health assistant. Ask me about symptoms, medicines, appointments, or which type of doctor may fit your concern.',
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PatientAIChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const recentQuestions = useMemo(
    () => messages.filter((message) => message.role === 'user').slice(-5).reverse(),
    [messages]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const response = await fetch('/api/patient-portal/assistant', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data.messages) && data.messages.length) {
          setMessages(data.messages);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitMessage(nextInput?: string) {
    const text = (nextInput ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setError('');
    setBusy(true);
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: text };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch('/api/patient-portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Assistant failed to respond');

      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: String(data.reply || 'I could not prepare a response. Please try again.'),
          doctors: Array.isArray(data.recommendedDoctors) ? data.recommendedDoctors : [],
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assistant failed to respond';
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  async function startNewChat() {
    const nextWelcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        'New chat started. Tell me what is going on, and I will help you think through safe next steps.',
    };
    setMessages([nextWelcome]);
    setInput('');
    setError('');
    await fetch('/api/patient-portal/assistant', { method: 'DELETE' }).catch(() => undefined);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] overflow-hidden rounded-lg border border-gray-200 bg-white">
      <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-gray-50 md:flex md:flex-col">
        <div className="border-b border-gray-200 p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent</p>
          <div className="space-y-1">
            {recentQuestions.length ? (
              recentQuestions.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setInput(message.content)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-white"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{message.content}</span>
                </button>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-sm text-gray-500">
                Your saved chat history will appear here.
              </p>
            )}
          </div>

          <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Care shortcuts</p>
          <div className="space-y-1">
            {careLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-white"
              >
                <item.icon className="h-4 w-4 shrink-0 text-gray-500" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-gray-950">AI Health Chat</h1>
              <p className="truncate text-sm text-gray-500">
                {session?.user?.name ? `Signed in as ${session.user.name}` : 'Patient assistant'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 md:hidden"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <div className="mx-auto max-w-3xl space-y-5">
            {historyLoading && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved chat...
              </div>
            )}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[88%] ${isUser ? 'order-first' : ''}`}>
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                        isUser ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>
                    {!!message.doctors?.length && (
                      <div className="mt-2 space-y-2">
                        {message.doctors.map((doctor) => (
                          <Link
                            key={doctor.id}
                            href={`/patient-portal/doctors/${doctor.id}`}
                            className="block rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm hover:border-emerald-200"
                          >
                            <p className="font-semibold text-emerald-950">{doctor.name}</p>
                            <p className="text-xs text-emerald-800">{doctor.specialization}</p>
                            <p className="mt-1 text-xs text-emerald-700">{doctor.reason}</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
                      <UserRound className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                Thinking through safe next steps...
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {!messages.some((message) => message.role === 'user') && (
              <div className="mb-3 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitMessage(prompt)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white p-2 shadow-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none focus:ring-0"
                placeholder="Ask a health question..."
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-gray-500">
              This assistant is not a diagnosis. For severe or urgent symptoms, seek emergency care.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
