-- Additive migration. Original content and profile JSON are retained.
alter table public.site_profile
  add column expected_graduation text not null default '' check (length(expected_graduation) <= 40),
  add column current_studies text[] not null default '{}' check (cardinality(current_studies) <= 20),
  add column scientific_interests text[] not null default '{}' check (cardinality(scientific_interests) <= 20),
  add column website_url public.http_url;
insert into public.site_profile (id, full_name, headline, short_bio, focus_areas)
values (1, 'Fernando Osman', 'Pharmacy Student',
  'Scientific communication, clinical evidence and data-driven learning in pharmacy.',
  array['Clinical Research','Medical Affairs','Data Analysis']) on conflict (id) do nothing;

alter table public.article_files add column project_id uuid references public.projects(id) on delete set null;
create index article_files_project_idx on public.article_files(project_id);
create policy "Published portfolio resources" on public.article_files for select to web_anon, web_admin
using (kind = 'resource' and status = 'ready' and visibility = 'public' and (
  exists(select 1 from public.projects p where p.id = project_id and p.status = 'published')
  or exists(select 1 from public.site_profile sp, jsonb_array_elements(sp.certifications) c
    where c->>'pdf_file_id' = article_files.id::text and coalesce(c->>'visible','true') <> 'false')
));

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('article_view','project_view','file_view','file_download')),
  entity_id uuid not null,
  article_id uuid references public.articles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  file_id uuid references public.article_files(id) on delete set null,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  created_at timestamptz not null default now(),
  unique(kind, entity_id, session_hash, window_start)
);
create index analytics_events_time_idx on public.analytics_events(created_at);
create index analytics_events_file_idx on public.analytics_events(file_id, created_at);
alter table public.analytics_events enable row level security;
grant insert on public.analytics_events to web_server;
grant select on public.analytics_events to web_admin;
create policy "Server records validated events" on public.analytics_events for insert to web_server with check (true);
create policy "Admins read analytics" on public.analytics_events for select to web_admin using (public.is_admin());
