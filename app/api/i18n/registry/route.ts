import { NextResponse } from 'next/server';
import { readRegistry, normalizeTextDir, type LanguageMeta } from '@/lib/i18n-files';

function withDir(rows: LanguageMeta[]) {
  return rows.map((row) => ({ ...row, dir: normalizeTextDir(row.dir) }));
}

export async function GET() {
  try {
    const languages = withDir(readRegistry());
    return NextResponse.json({ languages });
  } catch (e) {
    console.error('i18n registry read failed', e);
    return NextResponse.json(
      {
        languages: [
          { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' as const },
          { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' as const },
          { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' as const },
        ],
      },
      { status: 200 }
    );
  }
}
