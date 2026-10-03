import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getSiteProfile } from '@/services/public-content.service';

export async function generateMetadata({ params }: PageProps<'/[lang]/experience'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({
    title: t.experience.title,
    description: t.experience.description,
    path: '/experience',
    locale: lang,
  });
}

export default async function ExperiencePage({ params }: PageProps<'/[lang]/experience'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const copy = t.experience;
  const profile = await getSiteProfile(lang);
  return (
    <Container className="max-w-5xl pt-14 sm:pt-20">
      <header className="mb-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
        <p className="mt-5 max-w-xl font-serif text-xl text-muted">{copy.intro}</p>
      </header>
      {[
        {
          title: copy.experience,
          entries: profile?.experience.map((e) => ({ name: e.role, institution: e.organization, ...e })) ?? [],
        },
        { title: copy.education, entries: profile?.education.map((e) => ({ name: e.degree, ...e })) ?? [] },
      ].map((section) => (
        <section key={section.title} className="grid gap-6 border-t border-rule py-10 md:grid-cols-[12rem_1fr]">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ol className="timeline space-y-10 border-l border-rule pl-7">
            {section.entries.map((e, i) => (
              <li className="timeline-item relative" key={i}>
                <span className="timeline-dot absolute top-2 -left-[33px] size-2.5 rounded-full bg-teal-500" aria-hidden="true" />
                {e.logo ? (
                  <Image
                    src={publicImageUrl('profile-images', e.logo)!}
                    alt={copy.logo(e.institution)}
                    width={48}
                    height={48}
                    className="mb-4 rounded-lg object-contain"
                  />
                ) : null}
                <p className="mb-2 text-xs font-medium text-teal-700">
                  {e.start} - {e.current ? copy.present : e.end}
                </p>
                <h3 className="text-xl font-semibold">{e.name}</h3>
                <p className="mt-1 text-muted">{e.institution}</p>
                {'employment_type' in e && e.employment_type ? (
                  <p className="mt-2 text-sm text-muted">{e.employment_type}</p>
                ) : null}
                {'location' in e && e.location ? <p className="text-sm text-muted">{e.location}</p> : null}
                {'field' in e && e.field ? <p className="mt-2 text-sm text-muted">{e.field}</p> : null}
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{e.description}</p>
                {'activities' in e && e.activities ? (
                  <p className="mt-3 whitespace-pre-line text-sm text-muted">
                    <strong className="font-medium text-ink">{copy.activities}</strong>
                    {e.activities}
                  </p>
                ) : null}
                {'skills' in e && e.skills ? (
                  <p className="mt-3 text-sm text-muted">
                    <strong className="font-medium text-ink">{copy.skills}</strong>
                    {e.skills}
                  </p>
                ) : null}
              </li>
            ))}
            {!section.entries.length ? (
              <li className="text-sm text-muted">{copy.empty}</li>
            ) : null}
          </ol>
        </section>
      ))}
      <Link href={href('/cv')} className="link-arrow mt-6 inline-block font-medium text-azure-700">
        {copy.fullCv}
      </Link>
    </Container>
  );
}
