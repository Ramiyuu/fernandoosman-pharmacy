import 'server-only';

import type { Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
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

export async function getDashboard(db: Db) {
  try {
    return await db.transaction(async (tx) => {
      const stats = await tx.one<{ value: DashboardStats }>(sql`select public.admin_dashboard_stats() as value`);
      const recentArticles = await tx.many<RecentArticle>(sql`
        select id, title, status, updated_at from public.articles
        where deleted_at is null order by updated_at desc limit 6`);
      const activity = await tx.many<ActivityEntry>(sql`
        select l.id, l.action, l.summary, l.entity_type, l.entity_id, l.created_at,
               nullif(coalesce(nullif(p.display_name, ''), p.email), '') as actor_name
        from public.activity_logs l
        left join public.profiles p on p.id = l.actor_id
        order by l.created_at desc limit 12`);
      return { stats: stats.value, recentArticles, activity };
    });
  } catch (error) {
    failQuery('admin.dashboard', error);
  }
}
