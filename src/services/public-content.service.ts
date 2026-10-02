import 'server-only';

import { cache } from 'react';

import { asRichTextDoc } from '@/lib/content/rich-text';
import { createPublicSupabase } from '@/lib/supabase/public';
import type {
  ArticleCard,
  ArticleDetail,
  ArticleFilterOptions,
  ArticleFilters,
  Paginated,
  ProjectDetail,
  ProjectCard,
  PublicMetrics,
  SearchResults,
  SiteProfile,
  SiteSettings,
  SitemapEntries,
  TopicWithCount,
} from '@/types/content';

import { failQuery } from './errors';

/**
 * Read-only queries for the public site. They use the cookie-less anon client,
 * so results are identical for every visitor and safe to cache (ISR).
 */

const READ = { get: true } as const;

export const ARTICLES_PAGE_SIZE = 9;
export const PROJECTS_PAGE_SIZE = 9;
export const SEARCH_PAGE_SIZE = 10;

const offsetFor = (page: number, pageSize: number) => (Math.max(1, Math.floor(page)) - 1) * pageSize;

export const getPublishedArticles = cache(
  async (filters: ArticleFilters, page = 1, pageSize = ARTICLES_PAGE_SIZE): Promise<Paginated<ArticleCard>> => {
    const { data, error } = await createPublicSupabase().rpc(
      'get_published_articles',
      {
        p_topic: filters.topic,
        p_category: filters.category,
        p_tag: filters.tag,
        p_language: filters.language,
        p_year: filters.year,
        p_limit: pageSize,
        p_offset: offsetFor(page, pageSize),
      },
      READ,
    );
    if (error) failQuery('get_published_articles', error);
    return data as unknown as Paginated<ArticleCard>;
  },
);

export const getFeaturedArticle = cache(async (): Promise<ArticleCard | null> => {
  const { data, error } = await createPublicSupabase().rpc('get_featured_article', {}, READ);
  if (error) failQuery('get_featured_article', error);
  return (data as unknown as ArticleCard | null) ?? null;
});

export const getArticleBySlug = cache(async (slug: string): Promise<ArticleDetail | null> => {
  const { data, error } = await createPublicSupabase().rpc('get_article_by_slug', { p_slug: slug }, READ);
  if (error) failQuery('get_article_by_slug', error);
  if (!data) return null;
  const article = data as unknown as ArticleDetail;
  return { ...article, content: asRichTextDoc(article.content) };
});

export const getArticleFilterOptions = cache(async (): Promise<ArticleFilterOptions> => {
  const { data, error } = await createPublicSupabase().rpc('get_article_filter_options', {}, READ);
  if (error) failQuery('get_article_filter_options', error);
  return data as unknown as ArticleFilterOptions;
});

export const getTopicsWithCounts = cache(async (): Promise<TopicWithCount[]> => {
  const { data, error } = await createPublicSupabase().rpc('get_topics_with_counts', {}, READ);
  if (error) failQuery('get_topics_with_counts', error);
  return (data ?? []).map((topic) => ({ ...topic, article_count: Number(topic.article_count) }));
});

export const getTopicBySlug = cache(async (slug: string): Promise<TopicWithCount | null> => {
  const topics = await getTopicsWithCounts();
  return topics.find((topic) => topic.slug === slug) ?? null;
});

export const getPublicMetrics = cache(async (): Promise<PublicMetrics> => {
  const { data, error } = await createPublicSupabase().rpc('get_public_metrics', {}, READ);
  if (error) failQuery('get_public_metrics', error);
  return data as unknown as PublicMetrics;
});

export const getPublishedProjects = cache(
  async (page = 1, pageSize = PROJECTS_PAGE_SIZE): Promise<Paginated<ProjectCard>> => {
    const { data, error } = await createPublicSupabase().rpc(
      'get_published_projects',
      { p_limit: pageSize, p_offset: offsetFor(page, pageSize) },
      READ,
    );
    if (error) failQuery('get_published_projects', error);
    return data as unknown as Paginated<ProjectCard>;
  },
);

export const getProjectBySlug = cache(async (slug: string): Promise<ProjectDetail | null> => {
  const { data, error } = await createPublicSupabase().rpc('get_project_by_slug', { p_slug: slug }, READ);
  if (error) failQuery('get_project_by_slug', error);
  if (!data) return null;
  const project = data as unknown as ProjectDetail;
  return {
    ...project,
    content: asRichTextDoc(project.content),
    gallery: Array.isArray(project.gallery) ? project.gallery : [],
    links: Array.isArray(project.links) ? project.links : [],
  };
});

export const searchContent = cache(async (query: string, page = 1): Promise<SearchResults> => {
  const { data, error } = await createPublicSupabase().rpc(
    'search_content',
    { p_query: query.slice(0, 200), p_limit: SEARCH_PAGE_SIZE, p_offset: offsetFor(page, SEARCH_PAGE_SIZE) },
    READ,
  );
  if (error) failQuery('search_content', error);
  return data as unknown as SearchResults;
});

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const getSiteProfile = cache(async (): Promise<SiteProfile | null> => {
  const { data, error } = await createPublicSupabase().from('site_profile').select('*').eq('id', 1).maybeSingle();
  if (error) failQuery('site_profile', error);
  if (!data) return null;
  return {
    ...data,
    languages: asArray(data.languages),
    education: asArray(data.education),
    experience: asArray(data.experience),
    skills: asArray(data.skills),
    certifications: asArray(data.certifications),
  };
});

const DEFAULT_SETTINGS: SiteSettings = {
  site: {
    name: 'Fernando Osman',
    tagline: 'Pharmacy student · Clinical Research · Medical Affairs · Data Analysis',
    description: 'Scientific communication, clinical evidence and data-driven learning in pharmacy.',
    keywords: [],
  },
  contact: { intro: '' },
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const { data, error } = await createPublicSupabase().from('settings').select('key, value').in('key', ['site', 'contact']);
  if (error) failQuery('settings', error);
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    site: { ...DEFAULT_SETTINGS.site, ...(byKey.get('site') as Partial<SiteSettings['site']> | undefined) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(byKey.get('contact') as Partial<SiteSettings['contact']> | undefined) },
  };
});

export const getSitemapEntries = cache(async (): Promise<SitemapEntries> => {
  const { data, error } = await createPublicSupabase().rpc('get_sitemap_entries', {}, READ);
  if (error) failQuery('get_sitemap_entries', error);
  return data as unknown as SitemapEntries;
});

/** Storage location of the current public CV (RLS only exposes the active CV file). */
export async function getPublicCvFile(): Promise<{ storage_path: string; original_filename: string } | null> {
  const supabase = createPublicSupabase();
  const { data: profile, error } = await supabase.from('site_profile').select('cv_file_id').eq('id', 1).maybeSingle();
  if (error) failQuery('site_profile.cv_file_id', error);
  if (!profile?.cv_file_id) return null;

  const { data: file, error: fileError } = await supabase
    .from('article_files')
    .select('storage_path, original_filename')
    .eq('id', profile.cv_file_id)
    .eq('kind', 'cv')
    .eq('status', 'ready')
    .maybeSingle();
  if (fileError) failQuery('article_files.cv', fileError);
  return file ?? null;
}
