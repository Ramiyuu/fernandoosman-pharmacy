import Link from 'next/link';

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
          <h1
            id="hero-heading"
            className="display-condensed text-[3.25rem] leading-[0.92] font-semibold tracking-[-0.02em] text-ink sm:text-7xl lg:text-[5.75rem]"
          >
            {profile.full_name}
          </h1>
          <p className="mt-5 text-xl font-medium text-navy-800 sm:text-2xl">{profile.headline}</p>
          {profile.focus_areas.length > 0 ? (
            <p className="mt-2 text-base text-teal-700 sm:text-lg">{profile.focus_areas.join(' • ')}</p>
          ) : null}
          {profile.short_bio ? (
            <p className="mt-6 max-w-[34rem] font-serif text-xl leading-relaxed text-navy-900">{profile.short_bio}</p>
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
