import { Fragment, type ReactNode } from 'react';
import { findPhoneNumbersInText, type CountryCode } from 'libphonenumber-js';

type MatchKind = 'url' | 'www' | 'email' | 'phone';

type Candidate = {
  start: number;
  end: number;
  priority: number;
  kind: MatchKind;
  href: string;
  label: string;
};

const TRAIL_PUNCT = /[.,;:!?)>\]]+$/;

function trimUrlDisplay(s: string): string {
  let t = s;
  while (t.length > 0 && TRAIL_PUNCT.test(t)) {
    const m = t.match(TRAIL_PUNCT);
    if (!m || !m[0]) break;
    t = t.slice(0, -m[0].length);
  }
  return t;
}

const RE_URL = /https?:\/\/[^\s<>"']+/gi;
const RE_WWW = /\bwww\.[^\s<>"']+/gi;
const RE_EMAIL =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+/g;

function collectRegexCandidates(text: string, re: RegExp, priority: number, kind: MatchKind): Candidate[] {
  const out: Candidate[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags);
  while ((m = r.exec(text)) !== null) {
    let start = m.index;
    const raw = m[0];

    const trimmed = kind === 'email' ? raw : trimUrlDisplay(raw);
    if (!trimmed) continue;
    const end = start + trimmed.length;

    let href = trimmed;
    if (kind === 'www') href = `https://${trimmed}`;
    else if (kind === 'email') href = `mailto:${trimmed}`;

    out.push({ start, end, priority, kind, href, label: trimmed });
  }
  return out;
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

function pickNonOverlapping(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.end - a.end - (a.end - a.start);
  });
  const picked: Candidate[] = [];
  let cursor = 0;
  for (const c of sorted) {
    if (c.start < cursor) continue;
    picked.push(c);
    cursor = c.end;
  }
  return picked.sort((a, b) => a.start - b.start);
}

function phoneCandidates(text: string, phoneDefaultCountry?: CountryCode): Candidate[] {
  const opts = phoneDefaultCountry ? { defaultCountry: phoneDefaultCountry } : undefined;
  const found = findPhoneNumbersInText(text, opts);
  const out: Candidate[] = [];
  for (const n of found) {
    const slice = text.slice(n.startsAt, n.endsAt);
    if (!slice.trim()) continue;
    try {
      const href = n.number.getURI();
      out.push({
        start: n.startsAt,
        end: n.endsAt,
        priority: 4,
        kind: 'phone',
        href,
        label: slice,
      });
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

/** Split plain text into link + text spans (no HTML injection). */
export function autolinkSegments(
  text: string,
  phoneDefaultCountry?: CountryCode
): Array<{ type: 'text'; value: string } | { type: 'link'; href: string; label: string }> {
  if (!text) return [];

  const urlC = collectRegexCandidates(text, RE_URL, 0, 'url');
  const wwwC = collectRegexCandidates(text, RE_WWW, 1, 'www');
  const emailC = collectRegexCandidates(text, RE_EMAIL, 2, 'email');

  const firstPass = pickNonOverlapping([...urlC, ...wwwC, ...emailC]);

  const blocked: [number, number][] = firstPass.map((c) => [c.start, c.end]);
  const phones = phoneCandidates(text, phoneDefaultCountry).filter(
    (p) => !blocked.some((b) => rangesOverlap([p.start, p.end], b))
  );

  const all = pickNonOverlapping([...firstPass, ...phones]);

  const segments: Array<{ type: 'text'; value: string } | { type: 'link'; href: string; label: string }> = [];
  let pos = 0;
  for (const c of all) {
    if (c.start > pos) segments.push({ type: 'text', value: text.slice(pos, c.start) });
    segments.push({ type: 'link', href: c.href, label: c.label });
    pos = c.end;
  }
  if (pos < text.length) segments.push({ type: 'text', value: text.slice(pos) });
  return segments;
}

export function AutoLinkText({
  text,
  className,
  linkClassName,
  phoneDefaultCountry,
}: {
  text: string;
  className?: string;
  /** Applied to generated <a> (tel, mailto, http). */
  linkClassName?: string;
  phoneDefaultCountry?: CountryCode;
}): ReactNode {
  const segs = autolinkSegments(text, phoneDefaultCountry);
  const linkCls =
    linkClassName ??
    'font-medium text-teal-700 underline decoration-teal-600/40 underline-offset-2 hover:text-teal-800 break-all';

  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.type === 'text' ? (
          <Fragment key={i}>{s.value}</Fragment>
        ) : (
          <a
            key={i}
            href={s.href}
            className={linkCls}
            {...(s.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {s.label}
          </a>
        )
      )}
    </span>
  );
}
