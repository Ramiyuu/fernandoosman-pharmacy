import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { parsePageParam } from '@/features/articles/search-params';
import { ProjectCard } from '@/features/projects/components/project-card';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { PROJECTS_PAGE_SIZE, getPublishedProjects } from '@/services/public-content.service';

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/projects'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const page = parsePageParam((await searchParams).page);
  return buildMetadata({
    title: page > 1 ? t.meta.pageSuffix(t.projects.title, page) : t.projects.title,
    description: t.projects.description,
    path: page > 1 ? `/projects?page=${page}` : '/projects',
    locale: lang,
  });
}

export default async function ProjectsPage({ params, searchParams }: PageProps<'/[lang]/projects'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const page = parsePageParam((await searchParams).page);
  const projects = await getPublishedProjects(page, PROJECTS_PAGE_SIZE, lang);
  const totalPages = Math.max(1, Math.ceil(projects.total / PROJECTS_PAGE_SIZE));
  if (page > totalPages && projects.total > 0) notFound();
  const base = href('/projects');

  return (
    <Container>
      <PageHeader title={t.projects.title} description={t.projects.description} />
      {projects.items.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted">{t.projects.empty}</p>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => (target > 1 ? `${base}?page=${target}` : base)}
        className="mt-14"
      />
    </Container>
  );
}
