import 'server-only';

import type { Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';
import type { ActivityAction, ActivityEntityType } from '@/types/database.types';

const log = createLogger('activity');

const SENSITIVE_KEY = /pass|secret|token|cookie|session|key|signed|url|e-?mail|^ip$|ip_?address/i;

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
 * actor_id = the verified profile). Failures are logged but never block the
 * action. Never put secrets, tokens or visitors' personal data in metadata.
 */
export async function logActivity(db: Db, actorId: string, entry: ActivityEntry): Promise<void> {
  try {
    await db.execute(sql`
      insert into public.activity_logs (actor_id, action, entity_type, entity_id, summary, metadata)
      values (${actorId}, ${entry.action}, ${entry.entityType ?? null}, ${entry.entityId ?? null},
              ${(entry.summary ?? '').slice(0, 300)}, ${JSON.stringify(cleanMetadata(entry.metadata))}::jsonb)`);
  } catch (error) {
    log.warn('Could not record activity', { action: entry.action, error: describeError(error) });
  }
}
