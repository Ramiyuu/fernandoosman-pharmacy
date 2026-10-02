import 'server-only';

import { cache } from 'react';

import { cachedPublic } from '@/lib/cache/public-cache';
import { asRichTextDoc } from '@/lib/content/rich-text';
import { publicDb } from '@/lib/db/client';
import { compile, sql, type SqlFragment } from '@/lib/db/sql';
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
 * Read-only queries for the public site. They always run as `web_anon`, so
 * results are identical for every visitor, safe to cache (in memory, see
 * src/lib/cache/public-cache.ts) and limited by RLS to published content.
 */

export const ARTICLES_PAGE_SIZE = 9;
export const PROJECTS_PAGE_SIZE = 9;
export const SEARCH_PAGE_SIZE = 10;

const offsetFor = (page: number, pageSize: number) => (Math.max(1, Math.floor(page)) - 1) * pageSize;

/** Cache key for a query: its SQL text plus its parameters. */
function keyOf(query: SqlFragment): string {
  const { text, values } = compile(query);
  return `${text}|${JSON.stringify(values)}`;
}

/** Runs a cached query as web_anon; failures become a generic DataAccessError. */
async function read<T>(operation: string, query: SqlFragment, run: (query: SqlFragment) => Promise<T>): Promise<T> {
  try {
    return await cachedPublic(keyOf(query), () => run(query));
  } catch (error) {
    failQuery(operation, error);
  }
}

/** Runs a function that returns a single jsonb value. */
function value<T>(operation: string, query: SqlFragment): Promise<T> {
  return read(operation, query, async (q) => (await publicDb().one<{ value: T }>(q)).value);
}

export const getPublishedArticles = cache(
  async (filters: ArticleFilters, page = 1, pageSize = ARTICLES_PAGE_SIZE): Promise<Paginated<ArticleCard>> =>
    value(
      'get_published_articles',
      sql`select public.get_published_articles(
        p_topic => ${filters.topic ?? null}, p_category => ${filters.category ?? null}, p_tag => ${filters.tag ?? null},
        p_language => ${filters.language ?? null}, p_year => ${filters.year ?? null}::integer,
        p_limit => ${pageSize}::integer, p_offset => ${offsetFor(page, pageSize)}::integer
      ) as value`,
    ),
);

export const getFeaturedArticle = cache(
  async (): Promise<ArticleCard | null> => value('get_featured_article', sql`select public.get_featured_article() as value`),
);

export const getArticleBySlug = cache(async (slug: string): Promise<ArticleDetail | null> => {
  const article = await value<ArticleDetail | null>('get_article_by_slug', sql`select public.get_article_by_slug(${slug}) as value`);
  return article ? { ...article, content: asRichTextDoc(article.content) } : null;
});

export const getArticleFilterOptions = cache(
  async (): Promise<ArticleFilterOptions> =>
    value('get_article_filter_options', sql`select public.get_article_filter_options() as value`),
);

export const getTopicsWithCounts = cache(
  async (): Promise<TopicWithCount[]> =>
    read('get_topics_with_counts', sql`select * from public.get_topics_with_counts()`, (q) => publicDb().many<TopicWithCount>(q)),
);

export const getTopicBySlug = cache(async (slug: string): Promise<TopicWithCount | null> => {
  const topics = await getTopicsWithCounts();
  return topics.find((topic) => topic.slug === slug) ?? null;
});

export const getPublicMetrics = cache(
  async (): Promise<PublicMetrics> => value('get_public_metrics', sql`select public.get_public_metrics() as value`),
);

export const getPublishedProjects = cache(
  async (page = 1, pageSize = PROJECTS_PAGE_SIZE): Promise<Paginated<ProjectCard>> =>
    value(
      'get_published_projects',
      sql`select public.get_published_projects(${pageSize}::integer, ${offsetFor(page, pageSize)}::integer) as value`,
    ),
);

export const getProjectBySlug = cache(async (slug: string): Promise<ProjectDetail | null> => {
  const project = await value<ProjectDetail | null>('get_project_by_slug', sql`select public.get_project_by_slug(${slug}) as value`);
  if (!project) return null;
  return {
    ...project,
    content: asRichTextDoc(project.content),
    gallery: Array.isArray(project.gallery) ? project.gallery : [],
    links: Array.isArray(project.links) ? project.links : [],
  };
});

export const searchContent = cache(
  async (query: string, page = 1): Promise<SearchResults> =>
    value(
      'search_content',
      sql`select public.search_content(${query.slice(0, 200)}, ${SEARCH_PAGE_SIZE}::integer, ${offsetFor(page, SEARCH_PAGE_SIZE)}::integer) as value`,
    ),
);

const asArray = <T>(input: unknown): T[] => (Array.isArray(input) ? (input as T[]) : []);

export const getSiteProfile = cache(async (): Promise<SiteProfile | null> => {
  const data = await read('site_profile', sql`select * from public.site_profile where id = 1`, (q) =>
    publicDb().maybeOne<SiteProfile>(q),
  );
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
  const data = await read('settings', sql`select key, value from public.settings where key in ('site', 'contact')`, (q) =>
    publicDb().many<{ key: string; value: unknown }>(q),
  );
  const byKey = new Map(data.map((row) => [row.key, row.value]));
  return {
    site: { ...DEFAULT_SETTINGS.site, ...(byKey.get('site') as Partial<SiteSettings['site']> | undefined) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(byKey.get('contact') as Partial<SiteSettings['contact']> | undefined) },
  };
});

export const getSitemapEntries = cache(
  async (): Promise<SitemapEntries> => value('get_sitemap_entries', sql`select public.get_sitemap_entries() as value`),
);

/** Storage location of the current public CV (RLS only exposes the active CV file). */
export function getPublicCvFile(): Promise<{ storage_path: string; original_filename: string } | null> {
  return read(
    'article_files.cv',
    sql`
      select f.storage_path, f.original_filename
      from public.site_profile sp
      join public.article_files f on f.id = sp.cv_file_id
      where sp.id = 1 and f.kind = 'cv' and f.status = 'ready'`,
    (q) => publicDb().maybeOne<{ storage_path: string; original_filename: string }>(q),
  );
}
