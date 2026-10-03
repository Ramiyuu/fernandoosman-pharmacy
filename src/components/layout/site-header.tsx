import { Search } from 'lucide-react';
import Link from 'next/link';

import { LogoMark, Wordmark } from '@/components/brand/brand';
import { PUBLIC_NAV } from '@/config/site';
import { getI18n } from '@/i18n/server';

import { Container } from './container';
import { LanguageSwitcher } from './language-switcher';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

/** `languageSwitcher` is off on the admin's private preview, which has no public URL. */
export async function SiteHeader({ siteName, languageSwitcher = true }: { siteName: string; languageSwitcher?: boolean }) {
  const { locale, t, href } = await getI18n();
  const items = PUBLIC_NAV.map((item) => ({ href: href(item.href), label: t.nav[item.key] }));

  return (
    <header className="site-header sticky top-0 z-40 border-b border-rule bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container className="flex h-20 items-center justify-between gap-4">
        <Link href={href('/')} className="flex min-w-0 items-center gap-3 rounded-md" aria-label={t.nav.homeAria(siteName)}>
          <LogoMark height={28} priority />
          <Wordmark name={siteName} className="truncate text-[0.6875rem] sm:text-[0.8125rem]" />
        </Link>
        <nav aria-label={t.nav.main} className="flex items-center gap-1">
          <NavLinks items={items} />
          <Link
            href={href('/search')}
            className="hidden size-10 items-center justify-center rounded-md text-navy-800 transition-colors hover:bg-navy-50 hover:text-ink lg:inline-flex"
            aria-label={t.nav.searchArticles}
          >
            <Search className="size-[1.125rem]" aria-hidden="true" />
          </Link>
          {languageSwitcher ? (
            <LanguageSwitcher locale={locale} label={t.language.label} switchTo={t.language.switchTo} className="ml-1" />
          ) : null}
          <MobileNav
            siteName={siteName}
            home={{ href: href('/'), label: t.nav.home }}
            items={items}
            search={{ href: href('/search'), label: t.nav.search }}
            labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.siteNavigation, nav: t.nav.mobile }}
          />
        </nav>
      </Container>
    </header>
  );
}
