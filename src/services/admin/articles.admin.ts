import 'server-only';

import { asRichTextDoc, type RichTextDoc } from '@/lib/content/rich-text';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { ArticleReference, Paginated } from '@/types/content';
import type { ContentStatus, FileStatus, FileVisibility } from '@/types/database.types';

import { failQuery } from '../errors';

export const ADMIN_PAGE_SIZE = 20;

export type ArticleListView = 'all' | 'draft' | 'published' | 'archived' | 'trash';

export interface AdminArticleRow {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  featured: boolean;
  language: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
}

const LIST_COLUMNS = 'id, title, slug, status, featured, language, updated_at, published_at, deleted_at';

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listAdminArticles(
  supabase: ServerSupabase,
  options: { view: ArticleListView; query?: string; page: number },
): Promise<Paginated<AdminArticleRow>> {
  const from = (options.page - 1) * ADMIN_PAGE_SIZE;
  let request = supabase
    .from('articles')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  request = options.view === 'trash' ? request.not('deleted_at', 'is', null) : request.is('deleted_at', null);
  if (options.view !== 'all' && options.view !== 'trash') request = request.eq('status', options.view);
  if (options.query) request = request.ilike('title', likePattern(options.query.slice(0, 100)));

  const { data, count, error } = await request;
  if (error) failQuery('admin.articles.list', error);
  return { total: count ?? 0, items: (data ?? []) as AdminArticleRow[] };
}

export interface EditorFile {
  id: string;
  original_filename: string;
  label: string;
  size_bytes: number;
  visibility: FileVisibility;
  status: FileStatus;
  created_at: string;
}

export interface EditorArticle {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  content: RichTextDoc;
  status: ContentStatus;
  featured: boolean;
  language: 'en' | 'pt';
  translation_of_article_id: string | null;
  category_id: string | null;
  doi: string | null;
  external_url: string | null;
  seo_title: string;
  seo_description: string;
  cover_image_path: string | null;
  cover_image_alt: string;
  reading_time: number;
  published_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  topic_ids: string[];
  tags: string[];
  references: ArticleReference[];
  files: EditorFile[];
}

export async function getArticleForEditor(supabase: ServerSupabase, id: string): Promise<EditorArticle | null> {
  const { data: article, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) failQuery('admin.articles.get', error);
  if (!article) return null;

  const [topics, articleTags, references, files] = await Promise.all([
    supabase.from('article_topics').select('topic_id').eq('article_id', id),
    supabase.from('article_tags').select('tag_id').eq('article_id', id),
    supabase
      .from('article_references')
      .select('id, title, authors, journal, year, doi, url, pmid')
      .eq('article_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('article_files')
      .select('id, original_filename, label, size_bytes, visibility, status, created_at')
      .eq('article_id', id)
      .eq('kind', 'article_attachment')
      .order('created_at', { ascending: true }),
  ]);
  for (const result of [topics, articleTags, references, files]) {
    if (result.error) failQuery('admin.articles.relations', result.error);
  }

  const tagIds = (articleTags.data ?? []).map((row) => row.tag_id);
  let tagNames: string[] = [];
  if (tagIds.length > 0) {
    const { data: tags, error: tagsError } = await supabase.from('tags').select('id, name').in('id', tagIds);
    if (tagsError) failQuery('admin.articles.tags', tagsError);
    tagNames = (tags ?? []).map((tag) => tag.name).sort((a, b) => a.localeCompare(b));
  }

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    content: asRichTextDoc(article.content),
    status: article.status,
    featured: article.featured,
    language: article.language === 'pt' ? 'pt' : 'en',
    translation_of_article_id: article.translation_of_article_id,
    category_id: article.category_id,
    doi: article.doi,
    external_url: article.external_url,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    cover_image_path: article.cover_image_path,
    cover_image_alt: article.cover_image_alt,
    reading_time: article.reading_time,
    published_at: article.published_at,
    updated_at: article.updated_at,
    deleted_at: article.deleted_at,
    topic_ids: (topics.data ?? []).map((row) => row.topic_id),
    tags: tagNames,
    references: (references.data ?? []) as ArticleReference[],
    files: (files.data ?? []) as EditorFile[],
  };
}

export interface EditorOptions {
  topics: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  articles: Array<{ id: string; title: string; language: string }>;
  tags: string[];
}

export async function getEditorOptions(supabase: ServerSupabase, excludeArticleId?: string): Promise<EditorOptions> {
  const [topics, categories, articles, tags] = await Promise.all([
    supabase.from('topics').select('id, name').order('sort_order').order('name'),
    supabase.from('categories').select('id, name').order('sort_order').order('name'),
    supabase.from('articles').select('id, title, language').is('deleted_at', null).order('title').limit(500),
    supabase.from('tags').select('name').order('name').limit(500),
  ]);
  for (const result of [topics, categories, articles, tags]) {
    if (result.error) failQuery('admin.articles.options', result.error);
  }
  return {
    topics: topics.data ?? [],
    categories: categories.data ?? [],
    articles: (articles.data ?? []).filter((article) => article.id !== excludeArticleId),
    tags: (tags.data ?? []).map((tag) => tag.name),
  };
}
