import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';

import { PointerEffects } from '@/components/motion/pointer-effects';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/server';
import { getSiteProfile, getSiteSettings } from '@/services/public-content.service';

// Every public page renders on request: the database is not reachable while
// Railway builds, so nothing is prerendered. Data comes from the in-memory
// public cache (src/lib/cache/public-cache.ts), cleared on every admin change.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: { default: t.meta.homeTitle('Fernando Osman'), template: t.meta.titleTemplate },
    description: t.meta.defaultDescription,
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [settings, profile] = await Promise.all([getSiteSettings(lang), getSiteProfile(lang)]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-navy-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.nav.skip}
      </a>
      <SiteHeader siteName={settings.site.name} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {/* Page changes cross-fade (header and footer stay put); see globals.css. */}
        <ViewTransition default="none" update="fo-page">
          <div>{children}</div>
        </ViewTransition>
      </main>
      <SiteFooter siteName={settings.site.name} tagline={settings.site.tagline} profile={profile} />
      <PointerEffects />
    </>
  );
}
