import { FileText, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Tagline, Wordmark } from '@/components/brand/brand';
import { GitHubIcon, LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonVariants } from '@/components/ui/button';
import { semesterLabel } from '@/features/profile/components/profile-card';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata, truncate } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, personJsonLd } from '@/lib/seo/structured-data';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getSiteProfile } from '@/services/public-content.service';
import { safeExternalUrl } from '@/utils/url';

export async function generateMetadata({ params }: PageProps<'/[lang]/about'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const profile = await getSiteProfile(lang);
  return buildMetadata({
    title: t.about.title,
    description: truncate(profile?.short_bio || profile?.bio || t.about.fallbackDescription),
    path: '/about',
    locale: lang,
    type: 'profile',
    image: publicImageUrl('profile-images', profile?.photo_path),
  });
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const copy = t.about;
  const profile = await getSiteProfile(lang);
  if (!profile) notFound();

  const photo = publicImageUrl('profile-images', profile.photo_path);
  const paragraphs = profile.bio
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const semester = semesterLabel(profile, lang);
  const candidates: Array<{ label: string; url: string | null; icon: ReactNode }> = [
    { label: 'LinkedIn', url: safeExternalUrl(profile.linkedin_url), icon: <LinkedInIcon className="size-4" /> },
    { label: 'GitHub', url: safeExternalUrl(profile.github_url), icon: <GitHubIcon className="size-4" /> },
    { label: copy.lattes, url: safeExternalUrl(profile.lattes_url), icon: null },
    { label: 'ORCID', url: safeExternalUrl(profile.orcid_url), icon: null },
    { label: copy.website, url: safeExternalUrl(profile.website_url), icon: null },
  ];
  const links = candidates.filter((link): link is { label: string; url: string; icon: ReactNode } => Boolean(link.url));

  const facts = [
    { label: copy.course, value: profile.course },
    { label: copy.university, value: profile.university },
    { label: copy.semester, value: semester },
    { label: copy.graduation, value: profile.expected_graduation },
    { label: copy.basedIn, value: profile.location },
    {
      label: copy.languages,
      value: profile.languages
        .map((language) => `${language.name}${language.level ? ` (${language.level})` : ''}`)
        .join(', '),
    },
  ].filter((fact) => Boolean(fact.value));

  return (
    <Container>
      <JsonLd data={personJsonLd(profile, lang)} />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t.nav.home, path: '/' },
            { name: copy.title, path: '/about' },
          ],
          lang,
        )}
      />

      <div className="grid gap-12 pt-12 sm:pt-16 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] w-full max-w-72 overflow-hidden rounded-xl bg-navy-900">
            {photo ? (
              <Image
                src={photo}
                alt={copy.portrait(profile.full_name)}
                fill
                sizes="288px"
                className="object-cover"
                priority
              />
            ) : (
              <span
                className="flex size-full items-center justify-center text-6xl font-semibold text-teal-200"
                aria-hidden="true"
              >
                {profile.full_name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
            )}
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-muted">{fact.label}</dt>
                <dd className="mt-0.5 text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className="max-w-prose">
          <Wordmark
            as="h1"
            name={profile.full_name}
            className="text-3xl leading-tight tracking-[0.1em] sm:text-[2.75rem]"
          />
          <p className="mt-4 text-xl font-semibold text-navy-900">{profile.headline}</p>
          <Tagline items={profile.focus_areas} className="mt-2 font-light" />

          <div className="article-body mt-10 space-y-5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {profile.scientific_interests?.length ? (
            <section aria-labelledby="scientific-heading" className="mt-12">
              <h2 id="scientific-heading" className="text-lg font-semibold text-ink">
                {copy.scientificFocus}
              </h2>
              <p className="mt-4 font-serif text-lg leading-relaxed text-muted">
                {profile.scientific_interests.join(' · ')}
              </p>
            </section>
          ) : null}

          {profile.current_studies?.length ? (
            <section aria-labelledby="studies-heading" className="mt-10">
              <h2 id="studies-heading" className="text-lg font-semibold text-ink">
                {copy.currentlyStudying}
              </h2>
              <p className="mt-4 font-serif text-lg leading-relaxed text-muted">
                {profile.current_studies.join(' · ')}
              </p>
            </section>
          ) : null}

          {profile.interests.length > 0 ? (
            <section aria-labelledby="interests-heading" className="mt-12">
              <h2 id="interests-heading" className="text-lg font-semibold text-ink">
                {copy.interests}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <li
                    key={interest}
                    className="rounded-md bg-mist px-3 py-1.5 text-sm text-navy-900 ring-1 ring-rule ring-inset"
                  >
                    {interest}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="links-heading" className="mt-12 border-t border-rule pt-8">
            <h2 id="links-heading" className="text-lg font-semibold text-ink">
              {copy.elsewhere}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  {link.icon}
                  {link.label}
                </a>
              ))}
              {profile.professional_email ? (
                <a
                  href={`mailto:${profile.professional_email}`}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  <Mail aria-hidden="true" /> {profile.professional_email}
                </a>
              ) : null}
              <Link href={href('/cv')} className={buttonVariants({ variant: 'dark', size: 'sm' })}>
                <FileText aria-hidden="true" /> {copy.cv}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
