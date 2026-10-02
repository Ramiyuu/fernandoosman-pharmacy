import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';

import { failQuery } from '../errors';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function countBy(rows: Array<Record<string, string | null>> | null, key: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const value = row[key];
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export async function getTopicsAndCategories(supabase: ServerSupabase) {
  const [topics, categories, articleTopics, articles] = await Promise.all([
    supabase.from('topics').select('id, name, slug, description, icon, sort_order').order('sort_order').order('name'),
    supabase.from('categories').select('id, name, slug, description, sort_order').order('sort_order').order('name'),
    supabase.from('article_topics').select('topic_id'),
    supabase.from('articles').select('category_id').is('deleted_at', null),
  ]);
  for (const result of [topics, categories, articleTopics, articles]) {
    if (result.error) failQuery('admin.taxonomy', result.error);
  }
  const topicUsage = countBy(articleTopics.data, 'topic_id');
  const categoryUsage = countBy(articles.data, 'category_id');

  return {
    topics: (topics.data ?? []).map((topic) => {
      const usage = topicUsage.get(topic.id) ?? 0;
      return { ...topic, usage, usageLabel: plural(usage, 'article') };
    }),
    categories: (categories.data ?? []).map((category) => {
      const usage = categoryUsage.get(category.id) ?? 0;
      return { ...category, usage, usageLabel: plural(usage, 'article') };
    }),
  };
}

export async function getTagsWithUsage(supabase: ServerSupabase) {
  const { data, error } = await supabase.rpc('admin_tag_usage');
  if (error) failQuery('admin.tags', error);
  return (data ?? []).map((tag) => {
    const articles = Number(tag.article_count);
    const projects = Number(tag.project_count);
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      usage: articles + projects,
      usageLabel: `${plural(articles, 'article')}, ${plural(projects, 'project')}`,
    };
  });
}
