import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/features/articles/components/cover-image';
import type { ProjectCard as ProjectCardData } from '@/types/content';
import type { ProjectProgress } from '@/types/database.types';
import { cn } from '@/utils/cn';
import { formatMonthYear } from '@/utils/format';

export const PROGRESS_LABELS: Record<ProjectProgress, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
};

export function ProgressBadge({ progress }: { progress: ProjectProgress }) {
  const tone = progress === 'completed' ? 'success' : progress === 'in_progress' ? 'teal' : 'neutral';
  return <Badge tone={tone}>{PROGRESS_LABELS[progress]}</Badge>;
}

export function projectPeriod(project: Pick<ProjectCardData, 'started_on' | 'completed_on' | 'progress'>): string {
  const start = formatMonthYear(project.started_on);
  const end = project.completed_on ? formatMonthYear(project.completed_on) : project.progress === 'in_progress' ? 'present' : '';
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

export function ProjectCard({ project, className }: { project: ProjectCardData; className?: string }) {
  const period = projectPeriod(project);
  return (
    <article className={cn('group relative flex flex-col rounded-xl border border-rule bg-white p-4 transition-colors hover:border-rule-strong', className)}>
      <CoverImage
        bucket="project-images"
        path={project.cover_image_path}
        alt={project.cover_image_alt}
        seed={`project-${project.slug}`}
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
        className="aspect-[16/9] rounded-lg"
      />
      <div className="mt-4 flex items-center justify-between gap-2">
        <ProgressBadge progress={project.progress} />
        {period ? <span className="text-xs text-muted">{period}</span> : null}
      </div>
      <h3 className="mt-3 text-lg leading-snug font-semibold text-ink">
        <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-teal-500 group-hover:underline-offset-4">
          {project.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted">{project.summary}</p>
      {project.technologies.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Technologies">
          {project.technologies.map((technology) => (
            <li key={technology} className="rounded-sm bg-navy-50 px-1.5 py-0.5 text-xs text-navy-800">
              {technology}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
