import 'server-only';
import { createHmac } from 'node:crypto';
import { serverDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { serverEnv } from '@/lib/env';
export type EventKind = 'article_view' | 'project_view' | 'file_view' | 'file_download';
/** Call only after the target has passed a public RLS lookup. */
export async function recordEvent(
  kind: EventKind,
  id: string,
  session: string,
  related: { articleId?: string | null; projectId?: string | null } = {},
) {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const hash = createHmac('sha256', serverEnv().BETTER_AUTH_SECRET).update(`${day}:${session}`).digest('hex');
  const interval = kind === 'file_download' ? 60_000 : 1_800_000;
  await serverDb().execute(sql`insert into public.analytics_events
    (kind, entity_id, article_id, project_id, file_id, session_hash, window_start)
    values (${kind}, ${id}, ${related.articleId ?? (kind === 'article_view' ? id : null)},
      ${related.projectId ?? (kind === 'project_view' ? id : null)},
      ${kind.startsWith('file_') ? id : null}, ${hash}, ${new Date(Math.floor(now / interval) * interval).toISOString()}::timestamptz)
    on conflict do nothing`);
}
