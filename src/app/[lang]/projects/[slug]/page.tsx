import { ExternalLink, Languages } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { RichContent } from '@/components/content/rich-content';
import { ViewTracker } from '@/components/content/view-tracker';
import { GitHubIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { AttachmentsList } from '@/features/articles/components/attachments-list';
import { CoverImage } from '@/features/articles/components/cover-image';
import { ProgressBadge, projectPeriod } from '@/features/projects/components/project-card';
import { HTML_LANG, isLocale } from '@/i18n/config';
import { localizePath } from '@/i18n/routing';
import { i18nFor } from '@/i18n/server';
import { publicDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { buildMetadata, truncate } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, projectJsonLd } from '@/lib/seo/structured-data';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getProjectBySlug, getSiteProfile } from '@/services/public-content.service';
import type { ArticleAttachment } from '@/types/content';
import { languageLabel } from '@/utils/format';
import { isValidSlug } from '@/utils/slugify';
import { safeExternalUrl } from '@/utils/url';

async function loadProject(slug: string) {
  return isValidSlug(slug) ? getProjectBySlug(slug) : null;
}

export async function generateMetadata({ params }: PageProps<'/[lang]/projects/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const project = await loadProject(slug);
  if (!project) return { title: i18nFor(lang).t.projects.notFound, robots: { index: false } };
  const own = `/projects/${project.slug}`;
  const other = project.language === 'en' ? 'pt' : 'en';
  return buildMetadata({
    title: project.title,
    description: truncate(project.summary || project.title),
    path: own,
    locale: project.language,
    alternates: {
      [project.language]: own,
      [other]: project.translation ? `/projects/${project.translation.slug}` : null,
    },
    image: publicImageUrl('project-images', project.cover_image_path),
  });
}

export default async function ProjectPage({ params }: PageProps<'/[lang]/projects/[slug]'>) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const project = await loadProject(slug);
  if (!project) notFound();
  if (project.language !== lang && project.translation?.language === lang) {
    redirect(localizePath(lang, `/projects/${project.translation.slug}`));
  }
  const { t, href } = i18nFor(lang);
  const copy = t.projects;
  const textLang = HTML_LANG[project.language];
  const files = await publicDb().many<ArticleAttachment>(
    sql`select id, original_filename, label, size_bytes, visibility from public.article_files where project_id = ${project.id} and status = 'ready'`,
  );

  const profile = await getSiteProfile(lang);
  const repository = safeExternalUrl(project.repository_url);
  const live = safeExternalUrl(project.live_url);
  const period = projectPeriod(project, lang);
  const links = project.links
    .map((link) => ({ label: link.label, url: safeExternalUrl(link.url) }))
    .filter((link): link is { label: string; url: string } => Boolean(link.url && link.label));

  return (
    <article>
      <ViewTracker id={project.id} kind="project_view" />
      <JsonLd data={projectJsonLd(project, profile?.full_name ?? '', project.language)} />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t.nav.home, path: '/' },
            { name: copy.title, path: '/projects' },
            { name: project.title, path: `/projects/${project.slug}` },
          ],
          lang,
        )}
      />
      <Container>
        <nav aria-label={t.nav.breadcrumb} className="pt-8 text-sm text-muted">
          <Link href={href('/projects')} className="hover:text-ink hover:underline">
            {copy.title}
          </Link>
        </nav>
        <header className="grid gap-10 pt-8 pb-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ProgressBadge progress={project.progress} />
              {period ? <span className="text-sm text-muted">{period}</span> : null}
            </div>
            <h1 lang={textLang} className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-5xl">
              {project.title}
            </h1>
            <p lang={textLang} className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-navy-800">
              {project.summary}
            </p>
            {project.translation ? (
              <p className="language-note">
                <Languages className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t.language.available}{' '}
                  <Link
                    href={localizePath(project.translation.language, `/projects/${project.translation.slug}`)}
                    hrefLang={HTML_LANG[project.translation.language]}
                    lang={HTML_LANG[project.translation.language]}
                    className="font-medium underline"
                  >
                    {languageLabel(project.translation.language)}
                  </Link>
                </span>
              </p>
            ) : project.language !== lang ? (
              <p className="language-note">
                <Languages className="size-4 shrink-0" aria-hidden="true" />
                <span>{t.language.onlyIn(t.language.names[project.language])}</span>
              </p>
            ) : null}
          </div>
          <dl className="space-y-5 self-end rounded-xl border border-rule bg-mist p-5 text-sm">
            {project.technologies.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">{copy.technologies}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {project.technologies.map((technology) => (
                    <span
                      key={technology}
                      className="rounded-sm bg-white px-1.5 py-0.5 text-xs text-navy-800 ring-1 ring-rule ring-inset"
                    >
                      {technology}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {project.tags.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">{copy.tags}</dt>
                <dd className="mt-1 text-muted">{project.tags.map((tag) => tag.name).join(', ')}</dd>
              </div>
            ) : null}
            {repository || live || links.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">{copy.links}</dt>
                <dd className="mt-2 flex flex-col gap-1.5">
                  {repository ? (
                    <a
                      href={repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-azure-700 hover:underline"
                    >
                      <GitHubIcon className="size-3.5" /> {copy.repository}
                    </a>
                  ) : null}
                  {live ? (
                    <a
                      href={live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-azure-700 hover:underline"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" /> {copy.live}
                    </a>
                  ) : null}
                  {links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-azure-700 hover:underline"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" /> {link.label}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </header>

        <CoverImage
          bucket="project-images"
          path={project.cover_image_path}
          alt={project.cover_image_alt}
          seed={`project-${project.slug}`}
          sizes="(min-width: 1280px) 1216px, 100vw"
          priority
          className="aspect-[21/9] rounded-xl border border-rule"
        />

        <div className="mt-12 max-w-prose">
          <AttachmentsList files={files} />
          <div lang={textLang}>
            <RichContent doc={project.content} language={project.language} />
          </div>
        </div>

        {project.gallery.length > 0 ? (
          <section aria-labelledby="gallery-heading" className="mt-16">
            <h2 id="gallery-heading" className="text-xl font-semibold text-ink">
              {copy.gallery}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {project.gallery.map((image) => {
                const src = publicImageUrl('project-images', image.path);
                return src ? (
                  <li
                    key={image.path}
                    className="relative aspect-[16/10] overflow-hidden rounded-lg border border-rule"
                  >
                    <Image
                      src={src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        ) : null}
      </Container>
    </article>
  );
}
