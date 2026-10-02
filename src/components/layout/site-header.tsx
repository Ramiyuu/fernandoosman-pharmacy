import { Search } from 'lucide-react';
import Link from 'next/link';

import { LogoMark, Wordmark } from '@/components/brand/brand';

import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

export function SiteHeader({ siteName }: { siteName: string }) {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-rule bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container className="flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md" aria-label={`${siteName}, home`}>
          <LogoMark height={28} priority />
          <Wordmark name={siteName} className="truncate text-[0.6875rem] sm:text-[0.8125rem]" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLinks />
          <Link
            href="/search"
            className="hidden size-10 items-center justify-center rounded-md text-navy-800 transition-colors hover:bg-navy-50 hover:text-ink md:inline-flex"
            aria-label="Search articles"
          >
            <Search className="size-[1.125rem]" aria-hidden="true" />
          </Link>
          <MobileNav siteName={siteName} />
        </nav>
      </Container>
    </header>
  );
}
