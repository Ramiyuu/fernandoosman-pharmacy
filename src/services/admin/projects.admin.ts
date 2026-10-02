import 'server-only';

import { asRichTextDoc, type RichTextDoc } from '@/lib/content/rich-text';
import type { Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import type { ProjectImage, ProjectLink } from '@/types/content';
import type { ContentStatus, ProjectProgress, ProjectRow } from '@/types/database.types';

import { failQuery } from '../errors';

export interface AdminProjectRow {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  progress: ProjectProgress;
  featured: boolean;
  sort_order: number;
  updated_at: string;
}

export async function listAdminProjects(db: Db): Promise<AdminProjectRow[]> {
  try {
    return await db.many<AdminProjectRow>(sql`
      select id, title, slug, status, progress, featured, sort_order, updated_at
      from public.projects order by sort_order, updated_at desc`);
  } catch (error) {
    failQuery('admin.projects.list', error);
  }
}

export interface EditorProject {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: RichTextDoc;
  status: ContentStatus;
  progress: ProjectProgress;
  cover_image_path: string | null;
  cover_image_alt: string;
  gallery: ProjectImage[];
  repository_url: string | null;
  live_url: string | null;
  links: ProjectLink[];
  technologies: string[];
  tags: string[];
  started_on: string | null;
  completed_on: string | null;
  featured: boolean;
  sort_order: number;
}

export async function getProjectForEditor(db: Db, id: string): Promise<EditorProject | null> {
  try {
    return await db.transaction(async (tx) => {
      const project = await tx.maybeOne<ProjectRow>(sql`select * from public.projects where id = ${id}`);
      if (!project) return null;
      const tags = await tx.many<{ name: string }>(sql`
        select t.name from public.project_tags pt join public.tags t on t.id = pt.tag_id
        where pt.project_id = ${id} order by t.name`);

      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        content: asRichTextDoc(project.content),
        status: project.status,
        progress: project.progress,
        cover_image_path: project.cover_image_path,
        cover_image_alt: project.cover_image_alt,
        gallery: Array.isArray(project.gallery) ? (project.gallery as unknown as ProjectImage[]) : [],
        repository_url: project.repository_url,
        live_url: project.live_url,
        links: Array.isArray(project.links) ? (project.links as unknown as ProjectLink[]) : [],
        technologies: project.technologies,
        tags: tags.map((row) => row.name),
        started_on: project.started_on,
        completed_on: project.completed_on,
        featured: project.featured,
        sort_order: project.sort_order,
      };
    });
  } catch (error) {
    failQuery('admin.projects.get', error);
  }
}

export async function getTagSuggestions(db: Db): Promise<string[]> {
  try {
    const rows = await db.many<{ name: string }>(sql`select name from public.tags order by name limit 500`);
    return rows.map((row) => row.name);
  } catch (error) {
    failQuery('admin.tags.suggestions', error);
  }
}
