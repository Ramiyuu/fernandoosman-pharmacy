import 'server-only';

import { createLogger, describeError } from '@/lib/logger';
import type { ServerSupabase } from '@/lib/supabase/server';
import type { ActivityAction, ActivityEntityType } from '@/types/database.types';

const log = createLogger('activity');

const SENSITIVE_KEY = /pass|secret|token|cookie|session|key|signed|url/i;

type MetadataValue = string | number | boolean | null;

interface ActivityEntry {
  action: ActivityAction;
  entityType?: ActivityEntityType;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, MetadataValue>;
}

/** Keeps only short primitive values and drops anything that looks sensitive. */
function cleanMetadata(metadata: Record<string, MetadataValue> = {}): Record<string, MetadataValue> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .slice(0, 20)
      .map(([key, value]) => [key.slice(0, 40), typeof value === 'string' ? value.slice(0, 200) : value]),
  );
}

/**
 * Appends to the audit trail as the signed-in user (RLS requires
 * actor_id = auth.uid()). Failures are logged but never block the action.
 */
export async function logActivity(supabase: ServerSupabase, actorId: string, entry: ActivityEntry): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    actor_id: actorId,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    summary: (entry.summary ?? '').slice(0, 300),
    metadata: cleanMetadata(entry.metadata),
  });
  if (error) log.warn('Could not record activity', { action: entry.action, error: describeError(error) });
}
