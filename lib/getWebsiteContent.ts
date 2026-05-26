import dbConnect from '@/lib/mongodb';
import WebsiteContent from '@/models/WebsiteContent';
import { defaultWebsiteContent, type WebsiteContentData } from '@/lib/defaultWebsiteContent';

export async function getMergedWebsiteContent(): Promise<WebsiteContentData> {
  try {
    await dbConnect();
    const doc = await WebsiteContent.findOne().lean();
    if (!doc) {
      return { ...defaultWebsiteContent };
    }
    const d = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
    delete d._id;
    delete d.__v;
    delete d.createdAt;
    delete d.updatedAt;

    const merged: WebsiteContentData = { ...defaultWebsiteContent };
    (Object.keys(defaultWebsiteContent) as (keyof WebsiteContentData)[]).forEach((key) => {
      const v = d[key as string];
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        if (key === 'heroBullets') {
          (merged as Record<string, unknown>)[key] = (v as unknown[])
            .map((x) => String(x).trim())
            .filter(Boolean);
          return;
        }
        if (v.length > 0) (merged as Record<string, unknown>)[key] = v;
        return;
      }
      if (typeof v === 'boolean') {
        (merged as Record<string, unknown>)[key] = v;
        return;
      }
      if (typeof v === 'string' && v.trim() !== '') {
        (merged as Record<string, unknown>)[key] = v;
      }
    });
    return merged;
  } catch {
    return { ...defaultWebsiteContent };
  }
}
