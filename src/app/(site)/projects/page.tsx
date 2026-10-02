import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { parsePageParam } from '@/features/articles/search-params';
import { ProjectCard } from '@/features/projects/components/project-card';
import { buildMetadata } from '@/lib/seo/metadata';
import { PROJECTS_PAGE_SIZE, getPublishedProjects } from '@/services/public-content.service';

const DESCRIPTION = 'Data projects in health and pharmacy: dashboards, statistical analyses and reproducible notes.';

export async function generateMetadata({ searchParams }: PageProps<'/projects'>): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);
  return buildMetadata({
    title: page > 1 ? `Projects (page ${page})` : 'Projects',
    description: DESCRIPTION,
    path: page > 1 ? `/projects?page=${page}` : '/projects',
  });
}

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const page = parsePageParam((await searchParams).page);
  const projects = await getPublishedProjects(page);
  const totalPages = Math.max(1, Math.ceil(projects.total / PROJECTS_PAGE_SIZE));
  if (page > totalPages && projects.total > 0) notFound();

  return (
    <Container>
      <PageHeader title="Projects" description={DESCRIPTION} />
      {projects.items.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted">Projects will be listed here soon.</p>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => (target > 1 ? `/projects?page=${target}` : '/projects')}
        className="mt-14"
      />
    </Container>
  );
}
