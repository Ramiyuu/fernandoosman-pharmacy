-- =============================================================================
-- 0003 · Authentication tables (Better Auth)
-- =============================================================================
-- Shape required by Better Auth 1.7 with email + password, the two-factor
-- plugin, `generateId: "uuid"` and `schemaName: "auth"` (see
-- src/lib/auth/auth.ts). Better Auth validates this schema when it starts.
--
-- Only web_server (the website's login role) can reach this schema. Visitors'
-- and admins' content roles have no USAGE on it, so password hashes, session
-- tokens and 2FA secrets are never readable through a content query.
--
-- There is no public sign-up: accounts are created with `npm run admin`.
-- =============================================================================

create table auth."user" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null,
  "twoFactorEnabled" boolean
);

create table auth."session" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references auth."user" ("id") on delete cascade
);

-- `password` holds a scrypt hash (Better Auth default), never the password.
create table auth."account" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references auth."user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null
);

create table auth."verification" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

-- TOTP secret and backup codes are stored encrypted with BETTER_AUTH_SECRET.
create table auth."twoFactor" (
  "id" uuid default pg_catalog.gen_random_uuid() not null primary key,
  "secret" text not null,
  "backupCodes" text not null,
  "userId" uuid not null references auth."user" ("id") on delete cascade,
  "verified" boolean,
  "failedVerificationCount" integer,
  "lockedUntil" timestamptz
);

create index "session_userId_idx" on auth."session" ("userId");
create index "account_userId_idx" on auth."account" ("userId");
create index "verification_identifier_idx" on auth."verification" ("identifier");
create index "twoFactor_secret_idx" on auth."twoFactor" ("secret");
create index "twoFactor_userId_idx" on auth."twoFactor" ("userId");

grant select, insert, update, delete on all tables in schema auth to web_server;
