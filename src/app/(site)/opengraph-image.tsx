import { OG_SIZE, renderOgCard } from '@/lib/seo/og-card';
import { getSiteSettings } from '@/services/public-content.service';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fernando Osman — pharmacy, clinical research and data';
// Rendered on request (the database is not reachable while Railway builds);
// data comes from the in-memory public cache (src/lib/cache/public-cache.ts).
export const dynamic = 'force-dynamic';

export default async function Image() {
  const settings = await getSiteSettings();
  return renderOgCard({
    name: settings.site.name,
    eyebrow: 'Pharmacy student',
    title: settings.site.description,
    footer: 'Clinical Research  •  Medical Affairs  •  Data Analysis',
  });
}
