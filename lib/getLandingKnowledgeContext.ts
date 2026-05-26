import dbConnect from '@/lib/mongodb';
import LandingKnowledgeEntry from '@/models/LandingKnowledgeEntry';

/** Concatenate enabled entries for the public landing assistant (truncated). */
export async function getLandingKnowledgeContextForChat(maxTotalChars = 22_000): Promise<string> {
  await dbConnect();
  const docs = await LandingKnowledgeEntry.find({ enabled: true })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .select({ title: 1, resolvedText: 1 })
    .lean();

  const parts: string[] = [];
  let used = 0;

  for (const d of docs) {
    const block = (d.resolvedText || '').trim();
    if (!block) continue;
    const heading = typeof d.title === 'string' && d.title.trim() ? d.title.trim() : 'Untitled';
    const piece = `### ${heading}\n${block}`;
    const sep = parts.length ? 2 : 0;
    if (used + sep + piece.length > maxTotalChars) {
      const remain = maxTotalChars - used - sep - 4;
      if (remain > 120) parts.push(piece.slice(0, remain) + '…');
      break;
    }
    if (sep) used += 2;
    parts.push(piece);
    used += piece.length;
  }

  return parts.join('\n\n');
}
