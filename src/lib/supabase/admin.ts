import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { serverEnv } from '@/lib/env';
import { publicEnv } from '@/lib/public-env';
import type { Database } from '@/types/database.types';

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. BYPASSES RLS — only call it from server code *after*
 * the caller has been authorised (requireAdmin / RLS-checked lookups).
 * Used for: storage operations on private buckets, signed URLs, and inserting
 * contact-form messages. The key never leaves the server (`server-only`).
 */
export function createServiceSupabase() {
  if (client) return client;
  client = createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
