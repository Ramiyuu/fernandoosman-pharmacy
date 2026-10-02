import { z } from 'zod';

import type { ArticleFilters, Language } from '@/types/content';
import { SLUG_PATTERN } from '@/utils/slugify';

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const slugParam = z
  .string()
  .max(120)
  .regex(SLUG_PATTERN)
  .optional()
  .catch(undefined);

const schema = z.object({
  topic: slugParam,
  category: slugParam,
  tag: slugParam,
  language: z.enum(['en', 'pt']).optional().catch(undefined),
  year: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

/** Parses untrusted query params; anything invalid is ignored rather than erroring. */
export function parseArticleSearchParams(params: RawParams): { filters: ArticleFilters; page: number } {
  const parsed = schema.parse({
    topic: first(params.topic) || undefined,
    category: first(params.category) || undefined,
    tag: first(params.tag) || undefined,
    language: first(params.language) || undefined,
    year: first(params.year) || undefined,
    page: first(params.page) || 1,
  });
  const { page, ...filters } = parsed;
  return { filters: { ...filters, language: filters.language as Language | undefined }, page };
}

export function parsePageParam(value: string | string[] | undefined): number {
  return z.coerce.number().int().min(1).max(1000).catch(1).parse(first(value) || 1);
}

/** Builds a clean /articles URL (omits empty values and page 1). */
export function articlesHref(filters: ArticleFilters, page = 1, basePath = '/articles'): string {
  const params = new URLSearchParams();
  if (filters.topic) params.set('topic', filters.topic);
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.language) params.set('language', filters.language);
  if (filters.year) params.set('year', String(filters.year));
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function hasActiveFilters(filters: ArticleFilters): boolean {
  return Boolean(filters.topic || filters.category || filters.tag || filters.language || filters.year);
}
