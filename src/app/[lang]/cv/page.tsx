import { Download, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Wordmark } from '@/components/brand/brand';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonVariants } from '@/components/ui/button';
import { semesterLabel } from '@/features/profile/components/profile-card';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, personJsonLd } from '@/lib/seo/structured-data';
import { getSiteProfile } from '@/services/public-content.service';
import { formatDate } from '@/utils/format';
import { safeExternalUrl } from '@/utils/url';

export async function generateMetadata({ params }: PageProps<'/[lang]/cv'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const profile = await getSiteProfile(lang);
  return buildMetadata({
    title: t.cv.title,
    description: t.cv.description(profile?.full_name ?? 'Fernando Osman'),
    path: '/cv',
    locale: lang,
    type: 'profile',
  });
}

function CvSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-rule py-8 md:grid-cols-[12rem_1fr]">
      <h2 id={id} className="text-base font-semibold text-ink">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export default async function CvPage({ params }: PageProps<'/[lang]/cv'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t } = i18nFor(lang);
  const copy = t.cv;
  const profile = await getSiteProfile(lang);
  if (!profile) notFound();
  const semester = semesterLabel(profile, lang);
  const hasPdf = Boolean(profile.cv_file_id);

  return (
    <Container className="max-w-4xl">
      <JsonLd data={personJsonLd(profile, lang)} />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t.nav.home, path: '/' },
            { name: t.nav.cv, path: '/cv' },
          ],
          lang,
        )}
      />

      <header className="flex flex-col gap-6 pt-12 pb-10 sm:flex-row sm:items-end sm:justify-between sm:pt-16">
        <div>
          <Wordmark as="h1" name={profile.full_name} className="text-3xl leading-tight tracking-[0.1em] sm:text-4xl" />
          <p className="sr-only">{copy.title}</p>
          <p className="mt-3 text-lg text-navy-800">
            {[profile.headline, profile.course, profile.university].filter(Boolean).join(', ')}
          </p>
          <p className="mt-1 text-sm text-muted">{copy.lastUpdated(formatDate(profile.updated_at, lang))}</p>
        </div>
        {hasPdf ? (
          <div className="flex flex-wrap gap-2 print:hidden">
            {/* A file download from a route handler, not a page (the lint rule sees /api/cv as /[lang]/cv). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/cv?download=1" className={buttonVariants({ variant: 'primary' })}>
              <Download aria-hidden="true" /> {copy.downloadPdf}
            </a>
            <a href="/api/cv" target="_blank" rel="noopener" className={buttonVariants({ variant: 'secondary' })}>
              <ExternalLink aria-hidden="true" /> {copy.openPdf}
            </a>
          </div>
        ) : null}
      </header>

      {profile.short_bio ? (
        <CvSection id="cv-summary" title={copy.summary}>
          <p className="font-serif text-lg leading-relaxed text-navy-900">{profile.short_bio}</p>
        </CvSection>
      ) : null}

      {profile.education.length > 0 ? (
        <CvSection id="cv-education" title={copy.education}>
          <ol className="space-y-6">
            {profile.education.map((entry) => (
              <li key={`${entry.institution}-${entry.degree}`}>
                <p className="font-medium text-ink">{entry.degree}</p>
                <p className="text-navy-800">{entry.institution}</p>
                <p className="text-sm text-muted">
                  {copy.range(entry.start, entry.end)}
                  {semester && entry === profile.education[0] ? `, ${semester.toLowerCase()}` : ''}
                </p>
                {entry.description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </CvSection>
      ) : null}

      {profile.experience.length > 0 ? (
        <CvSection id="cv-experience" title={copy.experience}>
          <ol className="space-y-6">
            {profile.experience.map((entry) => (
              <li key={`${entry.organization}-${entry.role}-${entry.start}`}>
                <p className="font-medium text-ink">{entry.role}</p>
                <p className="text-navy-800">{entry.organization}</p>
                <p className="text-sm text-muted">{copy.range(entry.start, entry.end)}</p>
                {entry.description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </CvSection>
      ) : null}

      {profile.skills.length > 0 ? (
        <CvSection id="cv-skills" title={copy.skills}>
          <dl className="space-y-4">
            {profile.skills.map((group) => (
              <div key={group.group}>
                <dt className="text-sm font-medium text-ink">{group.group}</dt>
                <dd className="mt-1 text-navy-800">{group.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </CvSection>
      ) : null}

      {profile.certifications.length > 0 ? (
        <CvSection id="cv-certifications" title={copy.certifications}>
          <ul className="space-y-3">
            {profile.certifications.map((certification) => {
              const url = safeExternalUrl(certification.url);
              return (
                <li key={`${certification.name}-${certification.year}`}>
                  <p className="font-medium text-ink">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {certification.name}
                      </a>
                    ) : (
                      certification.name
                    )}
                  </p>
                  <p className="text-sm text-muted">{[certification.issuer, certification.year].filter(Boolean).join(', ')}</p>
                </li>
              );
            })}
          </ul>
        </CvSection>
      ) : null}

      {profile.languages.length > 0 ? (
        <CvSection id="cv-languages" title={copy.languages}>
          <ul className="space-y-1">
            {profile.languages.map((language) => (
              <li key={language.name} className="text-navy-900">
                {language.name}
                {language.level ? <span className="text-muted">, {language.level}</span> : null}
              </li>
            ))}
          </ul>
        </CvSection>
      ) : null}

      {!hasPdf ? (
        <p className="border-t border-rule pt-6 text-sm text-muted">{copy.pdfSoon}</p>
      ) : null}
    </Container>
  );
}
