import { NextRequest, NextResponse } from 'next/server';
import { listPublicDoctors } from '@/lib/public-doctors';
import { requireServiceKey, siteUrl } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

// GET /api/service/bridge/practitioners?specialty=&type=doctor|herbalist&q=&maxFee=&currency=&limit=
export async function GET(request: NextRequest) {
  const denied = requireServiceKey(request);
  if (denied) return denied;
  try {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') || sp.get('specialty') || '').trim().toLowerCase();
    const type = sp.get('type');
    const currency = (sp.get('currency') || '').toUpperCase();
    const maxFee = Number(sp.get('maxFee') || 0);
    const limit = Math.min(10, Math.max(1, Number(sp.get('limit') || 5)));

    let list = await listPublicDoctors();
    if (type === 'doctor' || type === 'herbalist') list = list.filter((d) => d.practitionerType === type);
    if (currency) list = list.filter((d) => d.currency === currency);
    if (maxFee > 0) list = list.filter((d) => d.consultationFee <= maxFee);
    if (q) {
      list = list.filter((d) =>
        [d.name, d.specialization, d.department, d.bio, ...d.languages].join(' ').toLowerCase().includes(q)
      );
    }
    // verified first, then rating
    list = [...list].sort(
      (a, b) => Number(b.verified) - Number(a.verified) || (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount
    );
    return NextResponse.json({
      success: true,
      practitioners: list.slice(0, limit).map((d) => ({
        id: d.id,
        name: d.name,
        type: d.practitionerType,
        specialization: d.specialization || d.department || 'General Practice',
        fee: d.consultationFee,
        currency: d.currency,
        verified: d.verified,
        rating: d.rating,
        yearsOfExperience: d.yearsOfExperience,
        languages: d.languages,
        profileUrl: `${siteUrl(request)}/find-doctors/${d.id}`,
      })),
      total: list.length,
    });
  } catch (e) {
    console.error('bridge/practitioners', e);
    return NextResponse.json({ success: false, error: 'Failed to load practitioners' }, { status: 500 });
  }
}
