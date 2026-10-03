import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { CoverImage } from '@/features/articles/components/cover-image';
import { HTML_LANG, type Locale } from '@/i18n/config';
import { dictionaryFor } from '@/i18n/dictionaries';
import { en } from '@/i18n/dictionaries/en';
import { getI18n } from '@/i18n/server';
import type { ProjectCard as ProjectCardData } from '@/types/content';
import type { ProjectProgress } from '@/types/database.types';
import { cn } from '@/utils/cn';
import { formatMonthYear } from '@/utils/format';

/** English labels, for the admin panel. */
export const PROGRESS_LABELS: Record<ProjectProgress, string> = en.projects.progress;

export async function ProgressBadge({ progress }: { progress: ProjectProgress }) {
  const { t } = await getI18n();
  const tone = progress === 'completed' ? 'success' : progress === 'in_progress' ? 'teal' : 'neutral';
  return <Badge tone={tone}>{t.projects.progress[progress]}</Badge>;
}

export function projectPeriod(
  project: Pick<ProjectCardData, 'started_on' | 'completed_on' | 'progress'>,
  locale: Locale,
): string {
  const copy = dictionaryFor(locale).projects;
  const start = formatMonthYear(project.started_on, locale);
  const end = project.completed_on
    ? formatMonthYear(project.completed_on, locale)
    : project.progress === 'in_progress'
      ? copy.present
      : '';
  if (start && end) return copy.period(start, end);
  return start || end;
}

export async function ProjectCard({ project, className }: { project: ProjectCardData; className?: string }) {
  const { locale, href } = await getI18n();
  const period = projectPeriod(project, locale);
  const foreign = project.language !== locale;
  return (
    <article
      data-spotlight
      className={cn('project-card group relative flex flex-col rounded-xl border border-rule bg-white p-4 transition-colors hover:border-rule-strong', className)}
    >
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
      <h3 className="mt-3 text-lg leading-snug font-semibold text-ink" lang={foreign ? HTML_LANG[project.language] : undefined}>
        <Link href={href(`/projects/${project.slug}`)} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-teal-500 group-hover:underline-offset-4">
          {project.title}
        </Link>
      </h3>
      <p
        className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted"
        lang={foreign ? HTML_LANG[project.language] : undefined}
      >
        {project.summary}
      </p>
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
