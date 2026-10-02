import 'server-only';

import { asRichTextDoc, type RichTextDoc } from '@/lib/content/rich-text';
import type { Db } from '@/lib/db/client';
import { sql, type SqlFragment } from '@/lib/db/sql';
import type { ArticleReference, Paginated } from '@/types/content';
import type { ArticleRow, ContentStatus, FileStatus, FileVisibility } from '@/types/database.types';

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

/** Escapes LIKE wildcards so user input is matched literally. */
export function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listAdminArticles(
  db: Db,
  options: { view: ArticleListView; query?: string; page: number },
): Promise<Paginated<AdminArticleRow>> {
  const conditions: SqlFragment[] = [options.view === 'trash' ? sql`deleted_at is not null` : sql`deleted_at is null`];
  if (options.view !== 'all' && options.view !== 'trash') conditions.push(sql`status = ${options.view}::public.content_status`);
  if (options.query) conditions.push(sql`title ilike ${likePattern(options.query.slice(0, 100))}`);
  const where = sql.join(conditions, sql` and `);

  try {
    return await db.transaction(async (tx) => {
      const items = await tx.many<AdminArticleRow>(sql`
        select id, title, slug, status, featured, language, updated_at, published_at, deleted_at
        from public.articles
        where ${where}
        order by updated_at desc
        limit ${ADMIN_PAGE_SIZE} offset ${(options.page - 1) * ADMIN_PAGE_SIZE}`);
      const { total } = await tx.one<{ total: number }>(sql`select count(*) as total from public.articles where ${where}`);
      return { total, items };
    });
  } catch (error) {
    failQuery('admin.articles.list', error);
  }
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

export async function getArticleForEditor(db: Db, id: string): Promise<EditorArticle | null> {
  try {
    return await db.transaction(async (tx) => {
      const article = await tx.maybeOne<ArticleRow>(sql`
        select id, title, slug, subtitle, excerpt, content, status, featured, language, translation_of_article_id,
               category_id, doi, external_url, seo_title, seo_description, cover_image_path, cover_image_alt,
               reading_time, published_at, updated_at, deleted_at
        from public.articles where id = ${id}`);
      if (!article) return null;

      // One connection per transaction: statements run one after another.
      const topics = await tx.many<{ topic_id: string }>(sql`select topic_id from public.article_topics where article_id = ${id}`);
      const tags = await tx.many<{ name: string }>(sql`
        select t.name from public.article_tags atg join public.tags t on t.id = atg.tag_id
        where atg.article_id = ${id} order by t.name`);
      const references = await tx.many<ArticleReference>(sql`
        select id, title, authors, journal, year, doi, url, pmid
        from public.article_references where article_id = ${id} order by position, created_at`);
      const files = await tx.many<EditorFile>(sql`
        select id, original_filename, label, size_bytes, visibility, status, created_at
        from public.article_files where article_id = ${id} and kind = 'article_attachment' order by created_at`);

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
        topic_ids: topics.map((row) => row.topic_id),
        tags: tags.map((row) => row.name),
        references,
        files,
      };
    });
  } catch (error) {
    failQuery('admin.articles.get', error);
  }
}

export interface EditorOptions {
  topics: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  articles: Array<{ id: string; title: string; language: string }>;
  tags: string[];
}

export async function getEditorOptions(db: Db, excludeArticleId?: string): Promise<EditorOptions> {
  try {
    return await db.transaction(async (tx) => {
      const topics = await tx.many<{ id: string; name: string }>(sql`select id, name from public.topics order by sort_order, name`);
      const categories = await tx.many<{ id: string; name: string }>(
        sql`select id, name from public.categories order by sort_order, name`,
      );
      const articles = await tx.many<{ id: string; title: string; language: string }>(
        sql`select id, title, language from public.articles where deleted_at is null order by title limit 500`,
      );
      const tags = await tx.many<{ name: string }>(sql`select name from public.tags order by name limit 500`);
      return {
        topics,
        categories,
        articles: articles.filter((article) => article.id !== excludeArticleId),
        tags: tags.map((tag) => tag.name),
      };
    });
  } catch (error) {
    failQuery('admin.articles.options', error);
  }
}
