import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/public-env';
import type { Database } from '@/types/database.types';

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Cookie-less client for public pages. It always acts as the `anon` role, so
 * visitors (and cached/ISR pages) can only ever receive what RLS exposes to
 * the public: published content and taxonomy.
 */
export function createPublicSupabase() {
  if (client) return client;
  const env = publicEnv();
  client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
