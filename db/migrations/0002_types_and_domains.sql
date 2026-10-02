-- =============================================================================
-- 0002 · Enum types and domains
-- =============================================================================
-- Domains keep format rules in one place so every table validates slugs, URLs
-- and DOIs the same way, independently of the application layer.

create type public.app_role as enum ('admin', 'editor');

create type public.content_status as enum ('draft', 'published', 'archived');

create type public.project_progress as enum ('planned', 'in_progress', 'completed');

-- 'public'  → visitors of the published article can request a short-lived signed URL.
-- 'private' → only staff can request a signed URL. The bucket itself is always private.
create type public.file_visibility as enum ('public', 'private');

-- Direct-to-storage uploads start as 'pending' and only become 'ready' after the
-- server has verified size, MIME type and PDF signature.
create type public.file_status as enum ('pending', 'ready', 'failed');

create type public.file_kind as enum ('article_attachment', 'cv');

create type public.activity_action as enum (
  'login',
  'logout',
  'article_created',
  'article_updated',
  'article_published',
  'article_unpublished',
  'article_archived',
  'article_deleted',
  'article_restored',
  'article_purged',
  'pdf_uploaded',
  'pdf_deleted',
  'image_uploaded',
  'image_deleted',
  'project_created',
  'project_updated',
  'project_deleted',
  'taxonomy_updated',
  'profile_updated',
  'settings_updated',
  'cv_updated',
  'contact_deleted',
  'two_factor_enabled',
  'backup_codes_regenerated',
  'password_changed',
  'sessions_revoked'
);

create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(value) <= 120);

create domain public.http_url as text
  check (value ~ '^https?://[^\s<>"]+$' and char_length(value) <= 2048);

create domain public.doi as text
  check (value ~ '^10\.[0-9]{4,9}/[^\s<>"]+$' and char_length(value) <= 255);
