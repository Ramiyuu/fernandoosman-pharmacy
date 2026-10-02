import { Search } from 'lucide-react';
import Link from 'next/link';

import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';

export function SiteHeader({ siteName }: { siteName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 rounded-md" aria-label={`${siteName}, home`}>
          <Monogram />
          <span className="text-[1.0625rem] font-semibold tracking-tight text-ink">{siteName}</span>
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

/** A small confidence-interval glyph: point estimate with whiskers. */
function Monogram() {
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-md bg-navy-900" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-5">
        <line x1="4" y1="12" x2="20" y2="12" stroke="#a9dfe4" strokeWidth="1.5" />
        <line x1="4" y1="8.5" x2="4" y2="15.5" stroke="#a9dfe4" strokeWidth="1.5" />
        <line x1="20" y1="8.5" x2="20" y2="15.5" stroke="#a9dfe4" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" fill="#ffffff" />
      </svg>
    </span>
  );
}
