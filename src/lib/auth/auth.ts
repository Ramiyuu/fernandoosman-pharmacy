import 'server-only';

import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { PostgresDialect } from 'kysely';

import { ADMIN_APP_NAME } from '@/config/site';
import { getPool } from '@/lib/db/pool';
import { serverEnv } from '@/lib/env';
import { siteUrl } from '@/lib/public-env';

import { AUTH_COOKIE_PREFIX } from './constants';

/** Admin sessions end after 12 hours without activity; the cookie also ends with the browser. */
const SESSION_SECONDS = 60 * 60 * 12;

function createAuth() {
  const env = serverEnv();
  const baseURL = siteUrl();

  return betterAuth({
    appName: ADMIN_APP_NAME,
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: {
      dialect: new PostgresDialect({ pool: getPool() }),
      type: 'postgres',
      schemaName: 'auth',
      transaction: true,
    },
    emailAndPassword: {
      enabled: true,
      // No public sign-up: accounts are created with `npm run admin -- create`.
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    session: {
      expiresIn: SESSION_SECONDS,
      updateAge: 60 * 60,
      // Changing the password or 2FA needs a sign-in from the last 15 minutes.
      freshAge: 60 * 15,
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: baseURL.startsWith('https://'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: [env.TRUSTED_IP_HEADER ?? 'x-forwarded-for'] },
    },
    telemetry: { enabled: false },
    plugins: [
      twoFactor({
        issuer: ADMIN_APP_NAME,
        backupCodeOptions: { amount: 10, length: 10 },
        // A sign-in challenge expires after 5 minutes; 10 wrong codes lock the account for 15 minutes.
        twoFactorCookieMaxAge: 60 * 5,
        accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 60 * 15 },
      }),
      // Must stay last: lets Server Actions set the auth cookies.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & { __portfolioAuth?: Auth };

/**
 * Better Auth instance, created on first use so that builds without secrets
 * work. It is only ever called from server code (Server Components, Server
 * Actions, Route Handlers): no /api/auth endpoint is exposed, so the only
 * ways to authenticate are the sign-in Server Actions in src/features/auth.
 */
export function getAuth(): Auth {
  globalForAuth.__portfolioAuth ??= createAuth();
  return globalForAuth.__portfolioAuth;
}
