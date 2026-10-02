create table public.videos (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  filename text not null check(length(filename) between 1 and 255),
  mime_type text not null check(mime_type in ('video/mp4','video/webm')),
  size_bytes bigint not null check(size_bytes between 1 and 524288000),
  storage_key text not null unique check(storage_key ~ '^videos/[a-f0-9-]{36}\.(mp4|webm)$'),
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  check(num_nonnulls(article_id,project_id) = 1)
);
alter table public.videos enable row level security;
grant select on public.videos to web_anon, web_admin;
grant insert, update, delete on public.videos to web_admin;
create policy "Admin manages videos" on public.videos to web_admin using(public.is_admin()) with check(public.is_admin());
create policy "Published videos" on public.videos for select to web_anon using(ready and (
  exists(select 1 from public.articles a where a.id = article_id and a.status = 'published' and a.deleted_at is null)
  or exists(select 1 from public.projects p where p.id = project_id and p.status = 'published')
));
