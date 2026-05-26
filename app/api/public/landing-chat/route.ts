import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AIModel from '@/models/AIModel';
import type { WebsiteContentData } from '@/lib/defaultWebsiteContent';
import { getMergedWebsiteContent } from '@/lib/getWebsiteContent';
import { getLandingSettings } from '@/lib/getLandingSettings';
import { getLandingKnowledgeContextForChat } from '@/lib/getLandingKnowledgeContext';
import { getLandingChatDoctorsContext } from '@/lib/getLandingChatDoctorsContext';

const MAX_MESSAGES = 14;
const MAX_CONTENT_PER_MESSAGE = 2500;
const MAX_REPLY_CHARS = 8000;

/** Matches `/api/ai/openai` so streaming and non-stream paths behave the same. */
const OPENAI_COMPANION_SYSTEM =
  'You are a medical AI assistant. Provide accurate, evidence-based medical information. Always recommend consulting with healthcare professionals for medical decisions.';

const NDJSON_TYPE = 'application/x-ndjson; charset=utf-8';

export type LandingNdjsonEvent =
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type LandingChatMessage = { role: 'user' | 'assistant'; content: string };

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function buildHospitalContext(content: WebsiteContentData): string {
  const lines: string[] = [];
  lines.push(`Hospital public name / hero title: ${content.heroTitle}`);
  lines.push(`Hero subtitle: ${content.heroSubtitle}`);
  if (content.heroBullets?.length) {
    lines.push(`Key points: ${content.heroBullets.join(' · ')}`);
  }
  lines.push(`About: ${content.aboutTitle} — ${truncate(content.aboutBody, 1200)}`);
  lines.push(`Mission: ${content.missionTitle} — ${truncate(content.missionBody, 600)}`);
  lines.push(
    `Clinical services (${content.servicesTitle}): ${content.services.map((s) => `${s.title}: ${truncate(s.description, 220)}`).join(' | ')}`
  );
  lines.push(
    `Departments (${content.departmentsTitle}): ${content.departments.map((d) => `${d.title}: ${truncate(d.description, 180)}`).join(' | ')}`
  );
  lines.push(`Visit / hours (${content.visitTitle}): ${content.visitSubtitle}`);
  content.visitRows.forEach((r) => lines.push(`  • ${r.label}: ${r.value}`));
  lines.push(`Contact (${content.contactTitle}): ${truncate(content.contactBody, 800)}`);
  lines.push(`Urgent help banner: ${content.ctaTitle} — ${content.ctaSubtitle}`);
  if (content.appointmentRequestEnabled) {
    lines.push(
      `Online appointment requests are enabled: ${content.appointmentSectionTitle} — ${truncate(content.appointmentSectionSubtitle, 400)}`
    );
  }
  const faqSample = content.faqItems.slice(0, 8).map((f) => `Q: ${f.question} A: ${truncate(f.answer, 350)}`);
  if (faqSample.length) lines.push(`FAQ excerpts:\n${faqSample.join('\n')}`);
  return truncate(lines.join('\n'), 14000);
}

function buildPrompt(systemBlock: string, context: string, messages: LandingChatMessage[]): string {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  return `${systemBlock}

--- Reference material (website copy, doctors/booking snapshot, knowledge base — incomplete; do not invent phone numbers, URLs, doctors, or clinical facts not stated here) ---
${context}

--- Conversation ---
${transcript}

Respond helpfully to the visitor's latest message as the Assistant. Keep answers concise unless they ask for detail.`;
}

function normalizeAiProvider(providerRaw: string): string {
  const key = providerRaw.trim().toLowerCase();
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    'google ai': 'Google',
    gemini: 'Google',
  };
  return map[key] ?? providerRaw.trim();
}

async function callProvider(
  origin: string,
  providerRaw: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<{ content: string } | { error: string; status: number }> {
  const provider = normalizeAiProvider(providerRaw);

  if (provider === 'OpenAI') {
    const res = await fetch(`${origin}/api/ai/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: modelId,
        maxTokens,
        temperature,
        apiKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.error === 'string' ? data.error : 'OpenAI request failed', status: res.status };
    if (!data.content) return { error: 'Empty AI response', status: 502 };
    return { content: data.content };
  }

  if (provider === 'Anthropic') {
    const res = await fetch(`${origin}/api/ai/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: modelId,
        maxTokens,
        temperature,
        apiKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.error === 'string' ? data.error : 'Anthropic request failed', status: res.status };
    if (!data.content) return { error: 'Empty AI response', status: 502 };
    return { content: data.content };
  }

  if (provider === 'Google') {
    const res = await fetch(`${origin}/api/ai/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: modelId,
        maxTokens,
        temperature,
        apiKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.error === 'string' ? data.error : 'Google AI request failed', status: res.status };
    if (!data.content) return { error: 'Empty AI response', status: 502 };
    return { content: data.content };
  }

  return {
    error:
      'Public chat supports OpenAI, Anthropic, or Google models only. Set an active LLM in Admin → AI configuration.',
    status: 501,
  };
}

function ndjsonLine(obj: LandingNdjsonEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

/**
 * Streams OpenAI chat deltas as NDJSON for the public widget (direct API — no extra hop).
 */
function openAiChatCompletionNdjsonStream(options: {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  userPrompt: string;
}): ReadableStream<Uint8Array> {
  const { apiKey, model, maxTokens, temperature, userPrompt } = options;

  return new ReadableStream({
    async start(controller) {
      const send = (ev: LandingNdjsonEvent) => controller.enqueue(ndjsonLine(ev));

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'gpt-4',
            stream: true,
            messages: [
              { role: 'system', content: OPENAI_COMPANION_SYSTEM },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg =
            typeof (errBody as { error?: { message?: string } }).error?.message === 'string'
              ? (errBody as { error: { message: string } }).error.message
              : `OpenAI request failed (${res.status})`;
          send({ type: 'error', message: msg });
          controller.close();
          return;
        }

        if (!res.body) {
          send({ type: 'error', message: 'Empty upstream response' });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let sseBuf = '';
        let outLen = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += dec.decode(value, { stream: true });

          const blocks = sseBuf.split('\n\n');
          sseBuf = blocks.pop() ?? '';

          for (const block of blocks) {
            for (const line of block.split('\n')) {
              const t = line.trim();
              if (!t.startsWith('data:')) continue;
              const data = t.slice(5).trim();
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string | null } }>;
                };
                const piece = json.choices?.[0]?.delta?.content;
                if (typeof piece === 'string' && piece) {
                  if (outLen >= MAX_REPLY_CHARS) continue;
                  const rest = MAX_REPLY_CHARS - outLen;
                  const part = piece.length > rest ? piece.slice(0, rest) : piece;
                  outLen += part.length;
                  if (part) send({ type: 'token', text: part });
                }
              } catch {
                /* non-JSON line */
              }
            }
          }
        }

        send({ type: 'done' });
        controller.close();
      } catch (e) {
        send({
          type: 'error',
          message: e instanceof Error ? e.message : 'Assistant stream failed.',
        });
        controller.close();
      }
    },
  });
}

/** One-shot providers as a single NDJSON stream so the client uses one parser. */
function bufferedReplyNdjsonStream(text: string | { error: string; status: number }): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  if (typeof text !== 'string') {
    return new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(JSON.stringify({ type: 'error', message: text.error }) + '\n'));
        c.close();
      },
    });
  }
  const trimmed = truncate(text, MAX_REPLY_CHARS);
  return new ReadableStream({
    start(c) {
      if (trimmed) c.enqueue(enc.encode(JSON.stringify({ type: 'token', text: trimmed }) + '\n'));
      c.enqueue(enc.encode(JSON.stringify({ type: 'done' }) + '\n'));
      c.close();
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const cms = await getMergedWebsiteContent();
    if (!cms.landingChatbotEnabled) {
      return NextResponse.json({ error: 'Chat assistant is disabled for this site.' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const rawMessages = (body as { messages?: unknown }).messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const messages: LandingChatMessage[] = [];
    for (const item of rawMessages) {
      if (messages.length >= MAX_MESSAGES) break;
      if (!item || typeof item !== 'object') continue;
      const role = (item as { role?: string }).role;
      const content = (item as { content?: string }).content;
      if (role !== 'user' && role !== 'assistant') continue;
      if (typeof content !== 'string' || !content.trim()) continue;
      messages.push({ role, content: truncate(content, MAX_CONTENT_PER_MESSAGE) });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      return NextResponse.json({ error: 'At least one user message is required' }, { status: 400 });
    }

    await dbConnect();
    const [activeModel, settings] = await Promise.all([
      AIModel.findOne({ isActive: true }).lean(),
      getLandingSettings(),
    ]);
    if (!activeModel?.apiKey?.trim()) {
      return NextResponse.json(
        { error: 'No active AI model is configured. Add one under AI settings in the admin panel.' },
        { status: 503 }
      );
    }

    if (activeModel.type !== 'llm' && activeModel.type !== 'multimodal') {
      return NextResponse.json(
        { error: 'Active model must be a text (LLM) type for the public chatbot.' },
        { status: 503 }
      );
    }

    const hospitalName = settings?.systemTitle?.trim() || cms.heroTitle;
    const ctx = buildHospitalContext(cms);

    let contextBlock = ctx;
    if (cms.useSettingsContact && settings?.address) {
      const addrParts = [
        settings.address.street,
        [settings.address.city, settings.address.state].filter(Boolean).join(', '),
        settings.address.postalCode,
        settings.address.country,
      ]
        .filter((x) => x?.trim())
        .join(' · ');
      const lines = [`Listed organisation contact (from settings): ${addrParts || '(address incomplete)'}`];
      if (settings.address.phone?.trim()) lines.push(`Phone: ${settings.address.phone.trim()}`);
      if (settings.address.email?.trim()) lines.push(`Email: ${settings.address.email.trim()}`);
      contextBlock = `${ctx}\n${lines.join('\n')}`;
    }

    contextBlock = truncate(contextBlock, 14500);

    const origin = request.nextUrl.origin;
    const [doctorsRaw, kbRaw] = await Promise.all([
      getLandingChatDoctorsContext({
        origin,
        appointmentRequestEnabled: cms.appointmentRequestEnabled,
        horizonDays: 5,
        maxDoctors: 28,
        maxChars: 14_000,
      }),
      getLandingKnowledgeContextForChat(18_000),
    ]);
    if (doctorsRaw.trim()) {
      contextBlock = `${contextBlock}\n\n--- Doctors & online booking snapshot ---\n${doctorsRaw}`;
    }

    if (kbRaw.trim()) {
      contextBlock = `${contextBlock}\n\n--- Knowledge base ---\n${kbRaw}`;
    }
    contextBlock = truncate(contextBlock, 52_000);

    const systemBlock = `You are a courteous assistant on the public website of "${hospitalName}".
Use the reference material below — website copy, the doctors & booking snapshot (only those doctors accept online booking on this site), knowledge base headings, and organisation contact details when present.

When visitors describe symptoms, concerns, or ask which doctor to see: give conservative triage-style suggestions only — suggest one or more doctors from the snapshot whose specialization, department, or listed qualifications plausibly relate to their concern. Never claim certainty or diagnose. If nothing fits well, say so and suggest contacting reception or emergency services if appropriate.

When discussing appointments: mention the booking page URL from the snapshot when online booking is enabled. You may summarise example slot times from the snapshot but always say availability is confirmed on the booking page and changes in real time. Do not invent doctors or slots outside the snapshot.

If something is not covered in the reference material, say you do not have that detail and suggest checking the website or contacting the hospital using published details.

Never diagnose or treat symptoms; never give personalised medical instructions. For urgent or emergency symptoms, tell them to use local emergency services immediately.

Stay neutral, inclusive, and concise (prefer under ~220 words unless the visitor asks for more detail).`;

    const prompt = buildPrompt(systemBlock, contextBlock, messages);
    const maxTokens = Math.min(activeModel.maxTokens || 1200, 1200);
    const temperature = Math.min(Math.max(activeModel.temperature ?? 0.35, 0), 1);
    const wantStream = (body as { stream?: boolean }).stream !== false;

    if (wantStream) {
      const provider = normalizeAiProvider(activeModel.provider);
      if (provider === 'OpenAI' && activeModel.apiKey?.trim()) {
        return new Response(
          openAiChatCompletionNdjsonStream({
            apiKey: activeModel.apiKey,
            model: activeModel.model,
            maxTokens,
            temperature,
            userPrompt: prompt,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': NDJSON_TYPE,
              'Cache-Control': 'no-store',
            },
          }
        );
      }

      const result = await callProvider(
        origin,
        activeModel.provider,
        activeModel.apiKey,
        activeModel.model,
        prompt,
        maxTokens,
        temperature
      );

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      const streamOut = bufferedReplyNdjsonStream(truncate(result.content, MAX_REPLY_CHARS));
      return new Response(streamOut, {
        status: 200,
        headers: {
          'Content-Type': NDJSON_TYPE,
          'Cache-Control': 'no-store',
        },
      });
    }

    const result = await callProvider(
      origin,
      activeModel.provider,
      activeModel.apiKey,
      activeModel.model,
      prompt,
      maxTokens,
      temperature
    );

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ reply: truncate(result.content, MAX_REPLY_CHARS) });
  } catch (e) {
    console.error('POST /api/public/landing-chat', e);
    return NextResponse.json({ error: 'Assistant unavailable. Try again later.' }, { status: 500 });
  }
}
