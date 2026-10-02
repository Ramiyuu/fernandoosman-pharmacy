import type { JSONContent } from '@tiptap/core';

import type { EditorArticle } from '@/services/admin/articles.admin';
import type { ArticleInput } from '@/schemas/article.schema';

/** Editor form state. Everything is a string in inputs; the server schema coerces. */
export interface ArticleFormValues {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  category_id: string;
  topic_ids: string[];
  tags: string[];
  language: 'en' | 'pt';
  translation_of_article_id: string;
  featured: boolean;
  doi: string;
  external_url: string;
  seo_title: string;
  seo_description: string;
  cover_image_path: string | null;
  cover_image_alt: string;
  references: Array<{ title: string; authors: string; journal: string; year: string; doi: string; url: string; pmid: string }>;
}

export function toFormValues(article: EditorArticle | null): ArticleFormValues {
  return {
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    subtitle: article?.subtitle ?? '',
    excerpt: article?.excerpt ?? '',
    category_id: article?.category_id ?? '',
    topic_ids: article?.topic_ids ?? [],
    tags: article?.tags ?? [],
    language: article?.language ?? 'en',
    translation_of_article_id: article?.translation_of_article_id ?? '',
    featured: article?.featured ?? false,
    doi: article?.doi ?? '',
    external_url: article?.external_url ?? '',
    seo_title: article?.seo_title ?? '',
    seo_description: article?.seo_description ?? '',
    cover_image_path: article?.cover_image_path ?? null,
    cover_image_alt: article?.cover_image_alt ?? '',
    references: (article?.references ?? []).map((reference) => ({
      title: reference.title,
      authors: reference.authors,
      journal: reference.journal,
      year: reference.year ? String(reference.year) : '',
      doi: reference.doi ?? '',
      url: reference.url ?? '',
      pmid: reference.pmid ?? '',
    })),
  };
}

export function toArticleInput(values: ArticleFormValues, id: string | null, content: JSONContent): ArticleInput {
  return {
    ...values,
    id,
    content,
    cover_image_path: values.cover_image_path ?? '',
    // Rows left completely blank are ignored instead of failing validation.
    references: values.references
      .filter((reference) => Object.values(reference).some((value) => value.trim() !== ''))
      .map((reference) => ({ ...reference, year: reference.year.trim() })),
  };
}
