import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/i18n/config';
import {
  localizeCard,
  localizeFilterOptions,
  localizeProfile,
  localizeSettings,
  localizeTopic,
} from '@/i18n/content';
import { cachedPublic } from '@/lib/cache/public-cache';
import { asRichTextDoc } from '@/lib/content/rich-text';
import { publicDb } from '@/lib/db/client';
import { compile, sql, type SqlFragment } from '@/lib/db/sql';
import type {
  EducationEntry,
  ExperienceEntry,
  CertificationEntry,
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
 *
 * Functions that take a locale return the visitor's language: listings pick
 * each text's version in that language (falling back to the other one), and
 * topic/category names, the profile and settings use their Portuguese fields
 * when the locale is pt and the field is filled in.
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
  async (
    filters: ArticleFilters,
    page = 1,
    pageSize = ARTICLES_PAGE_SIZE,
    locale: Locale | null = null,
  ): Promise<Paginated<ArticleCard>> => {
    const result = await value<Paginated<ArticleCard>>(
      'get_published_articles',
      sql`select public.get_published_articles(
        p_topic => ${filters.topic ?? null}, p_category => ${filters.category ?? null}, p_tag => ${filters.tag ?? null},
        p_language => ${filters.language ?? null}, p_year => ${filters.year ?? null}::integer,
        p_limit => ${pageSize}::integer, p_offset => ${offsetFor(page, pageSize)}::integer, p_locale => ${locale}
      ) as value`,
    );
    return locale ? { ...result, items: result.items.map((item) => localizeCard(item, locale)) } : result;
  },
);

export const getFeaturedArticle = cache(async (locale: Locale): Promise<ArticleCard | null> => {
  const article = await value<ArticleCard | null>(
    'get_featured_article',
    sql`select public.get_featured_article(${locale}) as value`,
  );
  return article ? localizeCard(article, locale) : null;
});

/** Any published version by slug (slugs are unique across languages). */
export const getArticleBySlug = cache(async (slug: string, locale: Locale): Promise<ArticleDetail | null> => {
  const article = await value<ArticleDetail | null>(
    'get_article_by_slug',
    sql`select public.get_article_by_slug(${slug}) as value`,
  );
  if (!article) return null;
  return {
    ...localizeCard(article, locale),
    content: asRichTextDoc(article.content),
    related: article.related.map((related) => localizeCard(related, locale)),
  };
});

export const getArticleFilterOptions = cache(async (locale: Locale): Promise<ArticleFilterOptions> =>
  localizeFilterOptions(
    await value<ArticleFilterOptions>(
      'get_article_filter_options',
      sql`select public.get_article_filter_options(${locale}) as value`,
    ),
    locale,
  ),
);

export const getTopicsWithCounts = cache(async (locale: Locale): Promise<TopicWithCount[]> => {
  const topics = await read('get_topics_with_counts', sql`select * from public.get_topics_with_counts(${locale})`, (q) =>
    publicDb().many<TopicWithCount>(q),
  );
  return topics.map((topic) => localizeTopic({ ...topic, article_count: Number(topic.article_count) }, locale));
});

export const getTopicBySlug = cache(async (slug: string, locale: Locale): Promise<TopicWithCount | null> => {
  const topics = await getTopicsWithCounts(locale);
  return topics.find((topic) => topic.slug === slug) ?? null;
});

export const getPublicMetrics = cache(async (locale: Locale): Promise<PublicMetrics> =>
  value('get_public_metrics', sql`select public.get_public_metrics(${locale}) as value`),
);

export const getPublishedProjects = cache(
  async (page = 1, pageSize = PROJECTS_PAGE_SIZE, locale: Locale | null = null): Promise<Paginated<ProjectCard>> =>
    value(
      'get_published_projects',
      sql`select public.get_published_projects(${pageSize}::integer, ${offsetFor(page, pageSize)}::integer, ${locale}) as value`,
    ),
);

export const getProjectBySlug = cache(async (slug: string): Promise<ProjectDetail | null> => {
  const project = await value<ProjectDetail | null>(
    'get_project_by_slug',
    sql`select public.get_project_by_slug(${slug}) as value`,
  );
  if (!project) return null;
  return {
    ...project,
    content: asRichTextDoc(project.content),
    gallery: Array.isArray(project.gallery) ? project.gallery : [],
    links: Array.isArray(project.links) ? project.links : [],
  };
});

export const searchContent = cache(async (query: string, page: number, locale: Locale): Promise<SearchResults> => {
  const results = await value<SearchResults>(
    'search_content',
    sql`select public.search_content(${query.slice(0, 200)}, ${SEARCH_PAGE_SIZE}::integer, ${offsetFor(page, SEARCH_PAGE_SIZE)}::integer, ${locale}) as value`,
  );
  return { ...results, items: results.items.map((item) => localizeCard(item, locale)) };
});

const visible = <T extends { visible?: boolean; order?: number }>(items: T[]) =>
  items.filter((x) => x.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const asArray = <T>(input: unknown): T[] => (Array.isArray(input) ? (input as T[]) : []);

const loadSiteProfile = cache(async (): Promise<SiteProfile | null> => {
  const data = await read('site_profile', sql`select * from public.site_profile where id = 1`, (q) =>
    publicDb().maybeOne<SiteProfile>(q),
  );
  if (!data) return null;
  return {
    ...data,
    languages: asArray(data.languages),
    education: visible(asArray<EducationEntry>(data.education)),
    experience: visible(asArray<ExperienceEntry>(data.experience)),
    skills: asArray(data.skills),
    certifications: visible(asArray<CertificationEntry>(data.certifications)),
    translations: data.translations && typeof data.translations === 'object' ? data.translations : {},
  };
});

/** The public profile; with a locale, in that language (Portuguese fields fall back to English). */
export const getSiteProfile = cache(async (locale?: Locale): Promise<SiteProfile | null> => {
  const profile = await loadSiteProfile();
  return profile && locale ? localizeProfile(profile, locale) : profile;
});

const DEFAULT_SETTINGS: SiteSettings = {
  site: {
    name: 'Fernando Osman',
    tagline: 'Pharmacy student · Clinical Research · Medical Affairs · Data Analysis',
    description: 'Scientific communication, clinical evidence and data-driven learning in pharmacy.',
    keywords: [],
    tagline_pt: 'Estudante de farmácia · Pesquisa Clínica · Medical Affairs · Análise de Dados',
    description_pt: 'Comunicação científica, evidência clínica e aprendizado orientado por dados em farmácia.',
  },
  contact: { intro: '', intro_pt: '' },
};

/** Site settings; without a locale, the stored values (English and Portuguese fields). */
export const getSiteSettings = cache(async (locale?: Locale): Promise<SiteSettings> => {
  const settings = await loadSiteSettings();
  return locale ? localizeSettings(settings, locale) : settings;
});

const loadSiteSettings = cache(async (): Promise<SiteSettings> => {
  const data = await read(
    'settings',
    sql`select key, value from public.settings where key in ('site', 'contact')`,
    (q) => publicDb().many<{ key: string; value: unknown }>(q),
  );
  const byKey = new Map(data.map((row) => [row.key, row.value]));
  return {
    site: { ...DEFAULT_SETTINGS.site, ...(byKey.get('site') as Partial<SiteSettings['site']> | undefined) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(byKey.get('contact') as Partial<SiteSettings['contact']> | undefined) },
  };
});

export const getSitemapEntries = cache(async (): Promise<SitemapEntries> =>
  value('get_sitemap_entries', sql`select public.get_sitemap_entries() as value`),
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
