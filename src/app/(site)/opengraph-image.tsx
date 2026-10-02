import { OG_SIZE, renderOgCard } from '@/lib/seo/og-card';
import { getSiteSettings } from '@/services/public-content.service';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fernando Osman — pharmacy, clinical research and data';
export const revalidate = 3600;

export default async function Image() {
  const settings = await getSiteSettings();
  return renderOgCard({
    eyebrow: 'Pharmacy student',
    title: settings.site.description,
    footer: settings.site.name,
  });
}
