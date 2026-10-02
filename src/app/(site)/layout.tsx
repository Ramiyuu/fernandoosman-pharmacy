import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSiteProfile, getSiteSettings } from '@/services/public-content.service';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [settings, profile] = await Promise.all([getSiteSettings(), getSiteProfile()]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-navy-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader siteName={settings.site.name} />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter siteName={settings.site.name} tagline={settings.site.tagline} profile={profile} />
    </>
  );
}
