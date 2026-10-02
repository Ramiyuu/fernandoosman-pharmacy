import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GitHubIcon } from '@/components/icons/brand-icons';
import { RichContent } from '@/components/content/rich-content';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { CoverImage } from '@/features/articles/components/cover-image';
import { ProgressBadge, projectPeriod } from '@/features/projects/components/project-card';
import { buildMetadata, truncate } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, projectJsonLd } from '@/lib/seo/structured-data';
import { publicImageUrl } from '@/lib/storage/public-url';
import { getProjectBySlug, getSiteProfile, getSitemapEntries } from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';
import { safeExternalUrl } from '@/utils/url';

export const revalidate = 300;

export async function generateStaticParams() {
  const entries = await getSitemapEntries();
  return entries.projects.map((project) => ({ slug: project.slug }));
}

async function loadProject(slug: string) {
  return isValidSlug(slug) ? getProjectBySlug(slug) : null;
}

export async function generateMetadata({ params }: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const project = await loadProject(slug);
  if (!project) return { title: 'Project not found', robots: { index: false } };
  return buildMetadata({
    title: project.title,
    description: truncate(project.summary || project.title),
    path: `/projects/${project.slug}`,
    image: publicImageUrl('project-images', project.cover_image_path),
  });
}

export default async function ProjectPage({ params }: PageProps<'/projects/[slug]'>) {
  const { slug } = await params;
  const project = await loadProject(slug);
  if (!project) notFound();

  const profile = await getSiteProfile();
  const repository = safeExternalUrl(project.repository_url);
  const live = safeExternalUrl(project.live_url);
  const period = projectPeriod(project);
  const links = project.links
    .map((link) => ({ label: link.label, url: safeExternalUrl(link.url) }))
    .filter((link): link is { label: string; url: string } => Boolean(link.url && link.label));

  return (
    <article>
      <JsonLd data={projectJsonLd(project, profile?.full_name ?? '')} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: project.title, path: `/projects/${project.slug}` },
        ])}
      />
      <Container>
        <nav aria-label="Breadcrumb" className="pt-8 text-sm text-muted">
          <Link href="/projects" className="hover:text-ink hover:underline">
            Projects
          </Link>
        </nav>
        <header className="grid gap-10 pt-8 pb-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ProgressBadge progress={project.progress} />
              {period ? <span className="text-sm text-muted">{period}</span> : null}
            </div>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-5xl">{project.title}</h1>
            <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-navy-800">{project.summary}</p>
          </div>
          <dl className="space-y-5 self-end rounded-xl border border-rule bg-mist p-5 text-sm">
            {project.technologies.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">Technologies</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {project.technologies.map((technology) => (
                    <span key={technology} className="rounded-sm bg-white px-1.5 py-0.5 text-xs text-navy-800 ring-1 ring-rule ring-inset">
                      {technology}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {project.tags.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">Tags</dt>
                <dd className="mt-1 text-muted">{project.tags.map((tag) => tag.name).join(', ')}</dd>
              </div>
            ) : null}
            {repository || live || links.length > 0 ? (
              <div>
                <dt className="font-medium text-ink">Links</dt>
                <dd className="mt-2 flex flex-col gap-1.5">
                  {repository ? (
                    <a href={repository} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-azure-700 hover:underline">
                      <GitHubIcon className="size-3.5" /> Repository
                    </a>
                  ) : null}
                  {live ? (
                    <a href={live} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-azure-700 hover:underline">
                      <ExternalLink className="size-3.5" aria-hidden="true" /> Live version
                    </a>
                  ) : null}
                  {links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-azure-700 hover:underline">
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
          <RichContent doc={project.content} />
        </div>

        {project.gallery.length > 0 ? (
          <section aria-labelledby="gallery-heading" className="mt-16">
            <h2 id="gallery-heading" className="text-xl font-semibold text-ink">
              Gallery
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {project.gallery.map((image) => {
                const src = publicImageUrl('project-images', image.path);
                return src ? (
                  <li key={image.path} className="relative aspect-[16/10] overflow-hidden rounded-lg border border-rule">
                    <Image src={src} alt={image.alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
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
