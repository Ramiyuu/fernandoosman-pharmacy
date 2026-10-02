import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
import type { ActivityAction, ContentStatus } from '@/types/database.types';

import { failQuery } from '../errors';

export interface DashboardStats {
  articles_published: number;
  articles_draft: number;
  articles_archived: number;
  articles_deleted: number;
  projects_total: number;
  projects_published: number;
  pdfs_total: number;
  topics_total: number;
  tags_total: number;
  messages_new: number;
  last_publication: { id: string; title: string; slug: string; published_at: string } | null;
  storage: { documents_bytes: number; documents_count: number; images_bytes: number; images_count: number };
}

export interface ActivityEntry {
  id: number;
  action: ActivityAction;
  summary: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface RecentArticle {
  id: string;
  title: string;
  status: ContentStatus;
  updated_at: string;
}

export async function getDashboard(supabase: ServerSupabase) {
  const [stats, recent, activity, profiles] = await Promise.all([
    supabase.rpc('admin_dashboard_stats'),
    supabase
      .from('articles')
      .select('id, title, status, updated_at')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('activity_logs')
      .select('id, actor_id, action, summary, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('profiles').select('id, display_name, email'),
  ]);
  if (stats.error) failQuery('admin.dashboard.stats', stats.error);
  if (recent.error) failQuery('admin.dashboard.recent', recent.error);
  if (activity.error) failQuery('admin.dashboard.activity', activity.error);
  if (profiles.error) failQuery('admin.dashboard.profiles', profiles.error);

  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.display_name || profile.email]));
  return {
    stats: stats.data as unknown as DashboardStats,
    recentArticles: (recent.data ?? []) as RecentArticle[],
    activity: (activity.data ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      created_at: entry.created_at,
      actor_name: entry.actor_id ? (names.get(entry.actor_id) ?? null) : null,
    })) satisfies ActivityEntry[],
  };
}
