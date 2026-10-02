import { Download, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Wordmark } from '@/components/brand/brand';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { buttonVariants } from '@/components/ui/button';
import { semesterLabel } from '@/features/profile/components/profile-card';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, personJsonLd } from '@/lib/seo/structured-data';
import { getSiteProfile } from '@/services/public-content.service';
import { formatDate } from '@/utils/format';
import { safeExternalUrl } from '@/utils/url';

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  return buildMetadata({
    title: 'Curriculum vitae',
    description: `Curriculum vitae of ${profile?.full_name ?? 'the author'}: education, experience, skills and languages.`,
    path: '/cv',
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

export default async function CvPage() {
  const profile = await getSiteProfile();
  if (!profile) notFound();
  const semester = semesterLabel(profile);
  const hasPdf = Boolean(profile.cv_file_id);

  return (
    <Container className="max-w-4xl">
      <JsonLd data={personJsonLd(profile)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'CV', path: '/cv' }])} />

      <header className="flex flex-col gap-6 pt-12 pb-10 sm:flex-row sm:items-end sm:justify-between sm:pt-16">
        <div>
          <p className="text-sm font-medium text-teal-700">Curriculum vitae</p>
          <Wordmark as="h1" name={profile.full_name} className="mt-3 text-3xl leading-tight tracking-[0.1em] sm:text-4xl" />
          <p className="mt-3 text-lg text-navy-800">
            {[profile.headline, profile.course, profile.university].filter(Boolean).join(', ')}
          </p>
          <p className="mt-1 text-sm text-muted">Last updated {formatDate(profile.updated_at)}</p>
        </div>
        {hasPdf ? (
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href="/api/cv?download=1" className={buttonVariants({ variant: 'primary' })}>
              <Download aria-hidden="true" /> Download PDF
            </a>
            <a href="/api/cv" target="_blank" rel="noopener" className={buttonVariants({ variant: 'secondary' })}>
              <ExternalLink aria-hidden="true" /> Open PDF
            </a>
          </div>
        ) : null}
      </header>

      {profile.short_bio ? (
        <CvSection id="cv-summary" title="Summary">
          <p className="font-serif text-lg leading-relaxed text-navy-900">{profile.short_bio}</p>
        </CvSection>
      ) : null}

      {profile.education.length > 0 ? (
        <CvSection id="cv-education" title="Education">
          <ol className="space-y-6">
            {profile.education.map((entry) => (
              <li key={`${entry.institution}-${entry.degree}`}>
                <p className="font-medium text-ink">{entry.degree}</p>
                <p className="text-navy-800">{entry.institution}</p>
                <p className="text-sm text-muted">
                  {[entry.start, entry.end].filter(Boolean).join(' to ')}
                  {semester && entry === profile.education[0] ? `, ${semester.toLowerCase()}` : ''}
                </p>
                {entry.description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </CvSection>
      ) : null}

      {profile.experience.length > 0 ? (
        <CvSection id="cv-experience" title="Experience">
          <ol className="space-y-6">
            {profile.experience.map((entry) => (
              <li key={`${entry.organization}-${entry.role}-${entry.start}`}>
                <p className="font-medium text-ink">{entry.role}</p>
                <p className="text-navy-800">{entry.organization}</p>
                <p className="text-sm text-muted">{[entry.start, entry.end].filter(Boolean).join(' to ')}</p>
                {entry.description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </CvSection>
      ) : null}

      {profile.skills.length > 0 ? (
        <CvSection id="cv-skills" title="Skills">
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
        <CvSection id="cv-certifications" title="Certifications">
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
        <CvSection id="cv-languages" title="Languages">
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
        <p className="border-t border-rule pt-6 text-sm text-muted">A PDF version will be available here soon.</p>
      ) : null}
    </Container>
  );
}
