import 'server-only';

import { asRichTextDoc, type RichTextDoc } from '@/lib/content/rich-text';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { ProjectImage, ProjectLink } from '@/types/content';
import type { ContentStatus, ProjectProgress } from '@/types/database.types';

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

export async function listAdminProjects(supabase: ServerSupabase): Promise<AdminProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, slug, status, progress, featured, sort_order, updated_at')
    .order('sort_order')
    .order('updated_at', { ascending: false });
  if (error) failQuery('admin.projects.list', error);
  return data ?? [];
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

export async function getProjectForEditor(supabase: ServerSupabase, id: string): Promise<EditorProject | null> {
  const { data: project, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) failQuery('admin.projects.get', error);
  if (!project) return null;

  const { data: links, error: linksError } = await supabase.from('project_tags').select('tag_id').eq('project_id', id);
  if (linksError) failQuery('admin.projects.tags', linksError);
  let tags: string[] = [];
  const tagIds = (links ?? []).map((row) => row.tag_id);
  if (tagIds.length > 0) {
    const { data: rows, error: tagsError } = await supabase.from('tags').select('name').in('id', tagIds);
    if (tagsError) failQuery('admin.projects.tag-names', tagsError);
    tags = (rows ?? []).map((row) => row.name);
  }

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
    tags,
    started_on: project.started_on,
    completed_on: project.completed_on,
    featured: project.featured,
    sort_order: project.sort_order,
  };
}

export async function getTagSuggestions(supabase: ServerSupabase): Promise<string[]> {
  const { data, error } = await supabase.from('tags').select('name').order('name').limit(500);
  if (error) failQuery('admin.tags.suggestions', error);
  return (data ?? []).map((row) => row.name);
}
