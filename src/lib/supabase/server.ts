import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/public-env';
import type { Database } from '@/types/database.types';

import { hardenAuthCookie } from './cookie-options';

/**
 * Supabase client bound to the current request's auth cookies. Every query
 * runs as the signed-in user, so RLS applies. Use for admin pages, Server
 * Actions and Route Handlers.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, hardenAuthCookie(options));
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session cookies on the next request.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;
