import Link from 'next/link';

import { Tagline, Wordmark } from '@/components/brand/brand';
import { LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import { buttonVariants } from '@/components/ui/button';
import { ProfileCard } from '@/features/profile/components/profile-card';
import type { SiteProfile } from '@/types/content';
import { safeExternalUrl } from '@/utils/url';

export function Hero({ profile }: { profile: SiteProfile }) {
  const linkedin = safeExternalUrl(profile.linkedin_url);
  return (
    <section aria-labelledby="hero-heading" className="border-b border-rule">
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_22rem] lg:items-end lg:gap-16">
        <div>
          <Wordmark
            as="h1"
            id="hero-heading"
            name={profile.full_name}
            className="text-[2.375rem] leading-[1.08] tracking-[0.1em] sm:text-6xl lg:text-[4.25rem]"
          />
          <span className="brand-gradient mt-6 block h-[3px] w-24 rounded-full" aria-hidden="true" />
          <Tagline items={profile.focus_areas} className="mt-5 text-base font-light sm:text-lg" />
          {profile.headline ? <p className="mt-6 text-xl font-semibold text-navy-900 sm:text-2xl">{profile.headline}</p> : null}
          {profile.short_bio ? (
            <p className="mt-4 max-w-[34rem] font-serif text-xl leading-relaxed text-navy-900">{profile.short_bio}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/articles" className={buttonVariants({ size: 'lg' })}>
              Read articles
            </Link>
            <Link href="/about" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              About me
            </Link>
            {linkedin ? (
              <a href={linkedin} target="_blank" rel="noopener noreferrer me" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
                <LinkedInIcon className="size-4 text-azure-700" /> LinkedIn
              </a>
            ) : null}
          </div>
        </div>
        <ProfileCard profile={profile} />
      </Container>
    </section>
  );
}
