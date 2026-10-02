import 'server-only';

import type { Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';

import { failQuery } from '../errors';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface TopicAdminRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  usage: number;
}

interface CategoryAdminRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  usage: number;
}

export async function getTopicsAndCategories(db: Db) {
  try {
    const { topics, categories } = await db.transaction(async (tx) => ({
      topics: await tx.many<TopicAdminRow>(sql`
        select t.id, t.name, t.slug, t.description, t.icon, t.sort_order,
               (select count(*) from public.article_topics atp where atp.topic_id = t.id) as usage
        from public.topics t order by t.sort_order, t.name`),
      categories: await tx.many<CategoryAdminRow>(sql`
        select c.id, c.name, c.slug, c.description, c.sort_order,
               (select count(*) from public.articles a where a.category_id = c.id and a.deleted_at is null) as usage
        from public.categories c order by c.sort_order, c.name`),
    }));
    return {
      topics: topics.map((topic) => ({ ...topic, usageLabel: plural(topic.usage, 'article') })),
      categories: categories.map((category) => ({ ...category, usageLabel: plural(category.usage, 'article') })),
    };
  } catch (error) {
    failQuery('admin.taxonomy', error);
  }
}

export async function getTagsWithUsage(db: Db) {
  let rows: Array<{ id: string; name: string; slug: string; article_count: number; project_count: number }>;
  try {
    rows = await db.many(sql`select id, name, slug, article_count, project_count from public.admin_tag_usage()`);
  } catch (error) {
    failQuery('admin.tags', error);
  }
  return rows.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    usage: tag.article_count + tag.project_count,
    usageLabel: `${plural(tag.article_count, 'article')}, ${plural(tag.project_count, 'project')}`,
  }));
}
