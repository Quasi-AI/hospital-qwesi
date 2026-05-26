import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeLocaleCode,
  validateLocaleCode,
  readMessagesJson,
  messagesFileExists,
} from '@/lib/i18n-files';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';
  const code = normalizeLocaleCode(locale);
  const invalid = validateLocaleCode(code);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    if (!messagesFileExists(code)) {
      if (code !== 'en' && messagesFileExists('en')) {
        const fallback = readMessagesJson('en');
        return NextResponse.json(fallback);
      }
      return NextResponse.json({ error: 'Locale not found' }, { status: 404 });
    }
    const messages = readMessagesJson(code);
    return NextResponse.json(messages);
  } catch (e) {
    console.error('i18n messages read failed', e);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
