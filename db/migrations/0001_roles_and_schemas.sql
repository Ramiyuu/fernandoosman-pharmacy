-- =============================================================================
-- 0001 · Database roles and schemas
-- =============================================================================
-- The application never reads or writes content with the role it logs in
-- with. Every transaction first switches to one of these NOLOGIN roles (see
-- src/lib/db/client.ts) and Row Level Security decides what that role may do:
--
--   web_anon    public visitors: published content and taxonomy only.
--   web_admin   a signed-in staff member. RLS reads the profile id that the
--               server verified from the session (transaction setting
--               app.profile_id); without it, web_admin sees nothing private.
--   web_server  trusted server tasks with no user context: Better Auth's
--               tables, storing contact-form messages, rate limiting.
--
-- The login role used by the website (created by scripts/db/migrate.mjs from
-- DATABASE_URL) only inherits web_server. It may switch to web_anon or
-- web_admin, but never inherits their privileges, owns no table and cannot
-- create, alter or drop anything.
--
-- Requires PostgreSQL 16+ (GRANT … WITH INHERIT FALSE).
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'web_anon') then
    create role web_anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'web_admin') then
    create role web_admin nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'web_server') then
    create role web_server nologin;
  end if;
end
$$;

grant web_anon to web_server with inherit false, set true;
grant web_admin to web_server with inherit false, set true;

-- Better Auth tables live in their own schema; private holds internal
-- bookkeeping (rate limits, migration history) that no web role can browse.
create schema if not exists auth;
create schema if not exists private;

revoke all on schema public from public;
revoke all on schema auth from public;
revoke all on schema private from public;

grant usage on schema public to web_anon, web_admin, web_server;
grant usage on schema auth to web_server;
grant usage on schema private to web_server;

-- Functions are executable by PUBLIC by default in PostgreSQL. Switch that off
-- for everything created by the migration owner from here on; each migration
-- grants EXECUTE explicitly to the roles that need it.
alter default privileges revoke execute on functions from public;
