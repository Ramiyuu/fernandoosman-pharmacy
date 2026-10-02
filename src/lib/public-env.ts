import { z } from 'zod';

// Public variables must be referenced literally (process.env.NEXT_PUBLIC_X)
// so Next.js can inline them at build time. Nothing secret belongs here.
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
});

type PublicEnv = z.infer<typeof schema>;

let cached: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    throw new Error('Invalid public environment: NEXT_PUBLIC_SITE_URL. Copy .env.example to .env.local.');
  }
  cached = { NEXT_PUBLIC_SITE_URL: parsed.data.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '') };
  return cached;
}

/** Canonical site origin without trailing slash; safe to call during build. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}
