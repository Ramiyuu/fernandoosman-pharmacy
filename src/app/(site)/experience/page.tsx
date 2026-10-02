import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/layout/container';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteProfile } from '@/services/public-content.service';
import { publicImageUrl } from '@/lib/storage/public-url';
export async function generateMetadata() {
  return buildMetadata({
    title: 'Experience & education',
    description: 'Academic background and professional experience.',
    path: '/experience',
  });
}
export default async function ExperiencePage() {
  const profile = await getSiteProfile();
  return (
    <Container className="max-w-5xl pt-14 sm:pt-20">
      <header className="mb-14">
        <p className="mb-4 text-sm font-medium text-teal-700">Academic & professional journey</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Experience & education</h1>
        <p className="mt-5 max-w-xl font-serif text-xl text-muted">
          The studies, teams and practical experiences shaping my work in pharmacy.
        </p>
      </header>
      {[
        {
          title: 'Experience',
          entries: profile?.experience.map((e) => ({ name: e.role, institution: e.organization, ...e })) ?? [],
        },
        { title: 'Education', entries: profile?.education.map((e) => ({ name: e.degree, ...e })) ?? [] },
      ].map((section) => (
        <section key={section.title} className="grid gap-6 border-t border-rule py-10 md:grid-cols-[12rem_1fr]">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ol className="space-y-10 border-l border-rule pl-7">
            {section.entries.map((e, i) => (
              <li className="relative" key={i}>
                <span className="absolute top-2 -left-[33px] size-2.5 rounded-full bg-teal-500" />
                {e.logo ? (
                  <Image
                    src={publicImageUrl('profile-images', e.logo)!}
                    alt={`${e.institution} logo`}
                    width={48}
                    height={48}
                    className="mb-4 rounded-lg object-contain"
                  />
                ) : null}
                <p className="mb-2 text-xs font-medium text-teal-700">
                  {e.start} — {e.current ? 'Present' : e.end}
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
                    <strong className="font-medium text-ink">Activities: </strong>
                    {e.activities}
                  </p>
                ) : null}
                {'skills' in e && e.skills ? (
                  <p className="mt-3 text-sm text-muted">
                    <strong className="font-medium text-ink">Skills: </strong>
                    {e.skills}
                  </p>
                ) : null}
              </li>
            ))}
            {!section.entries.length ? (
              <li className="text-sm text-muted">Details will be added here as the portfolio grows.</li>
            ) : null}
          </ol>
        </section>
      ))}
      <Link href="/cv" className="mt-6 inline-block font-medium text-azure-700">
        View full curriculum vitae →
      </Link>
    </Container>
  );
}
