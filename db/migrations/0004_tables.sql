-- =============================================================================
-- 0004 · Tables and indexes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: one row per auth user. role NULL means "no administrative access".
-- Rows are created by a trigger on auth."user"; roles are granted manually
-- (`npm run admin` creates the first admin with role = 'admin').
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth."user" (id) on delete cascade,
  email text,
  display_name text not null default '' check (char_length(display_name) <= 120),
  role public.app_role,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'NULL = no access. Grant manually: update public.profiles set role = ''admin'' where email = ...';

-- -----------------------------------------------------------------------------
-- Taxonomy
-- topics      → subject areas (Clinical Research, Biostatistics…), many per article
-- categories  → article format (Paper Review, Concept Explainer…), one per article
-- tags        → free-form keywords shared by articles and projects
-- -----------------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug public.slug not null unique,
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default 'flask-conical' check (icon ~ '^[a-z0-9-]{1,40}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug public.slug not null unique,
  description text not null default '' check (char_length(description) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  slug public.slug not null unique,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- articles
-- -----------------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null default '' check (char_length(title) <= 200),
  slug public.slug not null unique,
  subtitle text not null default '' check (char_length(subtitle) <= 300),
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  -- Tiptap/ProseMirror JSON document. Validated by the server before saving and
  -- rendered through an allow-list renderer: it is never injected as raw HTML.
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object' and content ->> 'type' = 'doc'),
  -- Plain-text projection of `content`, used for search and reading time.
  content_text text not null default '' check (char_length(content_text) <= 300000),
  cover_image_path text check (cover_image_path is null or cover_image_path ~ '^[a-z0-9/_-]+\.(jpg|png|webp|avif|gif)$'),
  cover_image_alt text not null default '' check (char_length(cover_image_alt) <= 300),
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  language text not null default 'en' check (language in ('en', 'pt')),
  translation_of_article_id uuid references public.articles (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  doi public.doi,
  external_url public.http_url,
  seo_title text not null default '' check (char_length(seo_title) <= 120),
  seo_description text not null default '' check (char_length(seo_description) <= 320),
  reading_time integer not null default 1 check (reading_time between 1 and 600),
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(subtitle, '') || ' ' || coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(content_text, '')), 'C')
  ) stored,
  constraint articles_published_has_date check (status <> 'published' or published_at is not null),
  constraint articles_translation_not_self check (translation_of_article_id is null or translation_of_article_id <> id)
);

-- At most one featured article at a time.
create unique index articles_single_featured_idx on public.articles (featured) where featured;
create index articles_public_listing_idx on public.articles (published_at desc) where status = 'published' and deleted_at is null;
create index articles_status_idx on public.articles (status, updated_at desc);
create index articles_category_idx on public.articles (category_id);
create index articles_author_idx on public.articles (author_id);
create index articles_translation_idx on public.articles (translation_of_article_id);
create index articles_search_idx on public.articles using gin (search_vector);

create table public.article_topics (
  article_id uuid not null references public.articles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (article_id, topic_id)
);
create index article_topics_topic_idx on public.article_topics (topic_id);

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);
create index article_tags_tag_idx on public.article_tags (tag_id);

create table public.article_references (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  position integer not null default 0,
  title text not null check (char_length(title) between 1 and 500),
  authors text not null default '' check (char_length(authors) <= 1000),
  journal text not null default '' check (char_length(journal) <= 300),
  year integer check (year is null or year between 1600 and 2100),
  doi public.doi,
  url public.http_url,
  pmid text check (pmid is null or pmid ~ '^[0-9]{1,9}$'),
  created_at timestamptz not null default now()
);
create index article_references_article_idx on public.article_references (article_id, position);

-- -----------------------------------------------------------------------------
-- article_files: PDF documents stored under `documents/` in the private R2
-- bucket. Only the storage path is stored. Signed URLs are generated on demand
-- and are never persisted.
-- -----------------------------------------------------------------------------
create table public.article_files (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete set null,
  kind public.file_kind not null default 'article_attachment',
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  internal_name text not null unique check (internal_name ~ '^[a-f0-9-]{36}\.pdf$'),
  storage_bucket text not null default 'documents' check (storage_bucket = 'documents'),
  storage_path text not null unique check (storage_path ~ '^[a-z0-9_-]+(/[a-z0-9_-]+)*/[a-f0-9-]{36}\.pdf$'),
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  label text not null default '' check (char_length(label) <= 200),
  visibility public.file_visibility not null default 'private',
  status public.file_status not null default 'pending',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_files_attachment_has_article check (kind <> 'article_attachment' or article_id is not null or status <> 'pending')
);
create index article_files_article_idx on public.article_files (article_id);
create index article_files_kind_status_idx on public.article_files (kind, status);

-- -----------------------------------------------------------------------------
-- media_files: images stored under `<bucket>/` in the private R2 bucket and
-- served by the site at /media/<bucket>/<path> (tracked for storage usage and
-- cleanup).
-- -----------------------------------------------------------------------------
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('article-images', 'profile-images', 'project-images')),
  storage_path text not null check (storage_path ~ '^[a-z0-9_-]+(/[a-z0-9_-]+)*/[a-f0-9-]{36}\.(jpg|png|webp|avif|gif)$'),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif')),
  size_bytes bigint not null check (size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  slug public.slug not null unique,
  summary text not null default '' check (char_length(summary) <= 600),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object' and content ->> 'type' = 'doc'),
  content_text text not null default '' check (char_length(content_text) <= 200000),
  status public.content_status not null default 'draft',
  progress public.project_progress not null default 'in_progress',
  cover_image_path text check (cover_image_path is null or cover_image_path ~ '^[a-z0-9/_-]+\.(jpg|png|webp|avif|gif)$'),
  cover_image_alt text not null default '' check (char_length(cover_image_alt) <= 300),
  -- [{ "path": "projects/<uuid>.webp", "alt": "…" }]
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 12),
  repository_url public.http_url,
  live_url public.http_url,
  -- [{ "label": "Report (PDF)", "url": "https://…" }]
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 10),
  technologies text[] not null default '{}' check (cardinality(technologies) <= 20),
  started_on date,
  completed_on date,
  featured boolean not null default false,
  sort_order integer not null default 0,
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(content_text, '')), 'C')
  ) stored,
  constraint projects_published_has_date check (status <> 'published' or published_at is not null),
  constraint projects_dates_ordered check (completed_on is null or started_on is null or completed_on >= started_on)
);
create index projects_public_listing_idx on public.projects (sort_order, published_at desc) where status = 'published';
create index projects_search_idx on public.projects using gin (search_vector);

create table public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (project_id, tag_id)
);
create index project_tags_tag_idx on public.project_tags (tag_id);

-- -----------------------------------------------------------------------------
-- site_profile: single-row table with the public "About" information.
-- -----------------------------------------------------------------------------
create table public.site_profile (
  id smallint primary key default 1 check (id = 1),
  full_name text not null default '' check (char_length(full_name) <= 120),
  headline text not null default '' check (char_length(headline) <= 120),
  focus_areas text[] not null default '{}' check (cardinality(focus_areas) <= 6),
  short_bio text not null default '' check (char_length(short_bio) <= 400),
  bio text not null default '' check (char_length(bio) <= 6000),
  photo_path text check (photo_path is null or photo_path ~ '^[a-z0-9/_-]+\.(jpg|png|webp|avif|gif)$'),
  course text not null default '' check (char_length(course) <= 120),
  university text not null default '' check (char_length(university) <= 160),
  current_semester integer check (current_semester is null or current_semester between 1 and 20),
  total_semesters integer check (total_semesters is null or total_semesters between 1 and 20),
  location text not null default '' check (char_length(location) <= 120),
  -- [{ "name": "English", "level": "Advanced (C1)" }]
  languages jsonb not null default '[]'::jsonb check (jsonb_typeof(languages) = 'array'),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  linkedin_url public.http_url,
  github_url public.http_url,
  lattes_url public.http_url,
  orcid_url public.http_url,
  professional_email text check (professional_email is null or professional_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cv_file_id uuid references public.article_files (id) on delete set null,
  -- Structured CV sections (rendered on /cv).
  education jsonb not null default '[]'::jsonb check (jsonb_typeof(education) = 'array'),
  experience jsonb not null default '[]'::jsonb check (jsonb_typeof(experience) = 'array'),
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  certifications jsonb not null default '[]'::jsonb check (jsonb_typeof(certifications) = 'array'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- settings: key/value configuration. Only rows flagged is_public are readable
-- by visitors.
-- -----------------------------------------------------------------------------
create table public.settings (
  key text primary key check (key ~ '^[a-z0-9_.]{1,64}$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- activity_logs: append-only audit trail. Never store secrets, tokens or
-- session data in `metadata`.
-- -----------------------------------------------------------------------------
create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action public.activity_action not null,
  entity_type text check (entity_type in ('article', 'project', 'file', 'image', 'topic', 'category', 'tag', 'profile', 'settings', 'auth', 'contact')),
  entity_id uuid,
  summary text not null default '' check (char_length(summary) <= 300),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 4096),
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- contacts: messages from the public contact form (inserted server-side only).
-- Personal data (LGPD): kept only to reply, deleted automatically after the
-- retention period (private.purge_expired_contacts, CONTACT_RETENTION_DAYS).
-- -----------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null default '' check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  -- When the sender accepted the privacy notice (required by the form).
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index contacts_created_idx on public.contacts (created_at desc);
