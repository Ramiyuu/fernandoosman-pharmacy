import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import type { SiteProfile } from '@/types/content';
import { safeExternalUrl } from '@/utils/url';
import { ResearchOrbit } from './research-orbit';

export function Hero({ profile }: { profile: SiteProfile }) {
  const linkedin = safeExternalUrl(profile.linkedin_url);
  return (
    <section aria-labelledby="hero-heading" className="science-hero">
      <Container className="relative grid items-center gap-6 pt-16 pb-12 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pt-28 lg:pb-20">
        <div className="hero-intro">
          <p className="mb-7 flex items-center gap-3 text-sm font-medium text-teal-200">
            <span className="size-2 rounded-full bg-teal-500" />
            {profile.headline || 'Pharmacy Student'}
          </p>
          <h1 id="hero-heading" className="hero-name">
            {profile.full_name}
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">
            {profile.focus_areas.join(' · ')}
          </p>
          <p className="mt-5 max-w-lg font-serif text-xl leading-relaxed text-white/90 sm:text-2xl">
            {profile.short_bio}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/articles" className="hero-primary">
              Explore articles <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/about" className="hero-secondary">
              About me
            </Link>
            {linkedin ? (
              <a href={linkedin} target="_blank" rel="noopener noreferrer me" className="hero-link">
                <LinkedInIcon className="size-4" /> LinkedIn
              </a>
            ) : null}
          </div>
        </div>
        <ResearchOrbit />
        <a href="#profile-snapshot" className="mt-8 flex w-fit items-center gap-3 text-xs text-navy-200 lg:col-span-2">
          <ArrowDown size={15} aria-hidden="true" /> A closer look at my work
        </a>
      </Container>
    </section>
  );
}
