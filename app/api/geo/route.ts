import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Where is the visitor? Hosting headers first (free, instant), then an IP lookup API. Returns an ISO country code like "GH". */
export async function GET(request: NextRequest) {
  const h = request.headers;
  const fromHeader = h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('x-country-code') || h.get('cloudfront-viewer-country');
  if (fromHeader && /^[A-Za-z]{2}$/.test(fromHeader) && fromHeader.toUpperCase() !== 'XX') {
    return NextResponse.json({ country: fromHeader.toUpperCase(), source: 'host' });
  }
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '';
  if (ip && !/^(::1|127\.|10\.|192\.168\.)/.test(ip)) {
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, { signal: AbortSignal.timeout(2500), cache: 'no-store' });
      const data = await res.json();
      if (data?.success && /^[A-Za-z]{2}$/.test(data.country_code || '')) return NextResponse.json({ country: String(data.country_code).toUpperCase(), source: 'ip' });
    } catch { /* fall through */ }
  }
  return NextResponse.json({ country: null });
}
