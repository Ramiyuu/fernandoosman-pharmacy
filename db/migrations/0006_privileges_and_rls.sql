-- =============================================================================
-- 0006 · Privileges and Row Level Security
-- =============================================================================
-- Model (roles from 0001)
--   web_anon (visitors)             : SELECT published content + taxonomy only.
--   web_admin + staff profile       : SELECT everything content-related.
--     · admin                       : full CRUD.
--     · editor (prepared, inactive) : create/edit own non-published articles.
--   web_admin without a valid       : the same as a visitor.
--     app.profile_id
--   web_server (server tasks)       : INSERT contact-form messages after
--                                     validation, honeypot and rate limiting.
--                                     It cannot read or change any content.
--
-- Privileges are granted explicitly (least privilege) and RLS is enabled on
-- every table. A table without a matching policy denies access. No role used
-- by the website bypasses RLS or owns a table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Public author directory: exposes only the display name of active staff so
-- visitors can see who wrote an article without reading `profiles`.
-- Intentionally runs with the owner's privileges (security_invoker = false)
-- and selects nothing sensitive.
-- -----------------------------------------------------------------------------
create view public.public_authors
with (security_invoker = false) as
  select p.id, p.display_name
  from public.profiles p
  where p.role is not null and p.is_active;

-- -----------------------------------------------------------------------------
-- Baseline privileges
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from public, web_anon, web_admin, web_server;
revoke all on all sequences in schema public from public, web_anon, web_admin, web_server;

-- Public read surface (still filtered by RLS).
grant select on
  public.topics,
  public.categories,
  public.tags,
  public.articles,
  public.article_topics,
  public.article_tags,
  public.article_references,
  public.article_files,
  public.projects,
  public.project_tags,
  public.site_profile,
  public.settings,
  public.public_authors
to web_anon, web_admin;

-- Staff writes (every row still has to pass an admin/staff policy).
grant insert, update, delete on
  public.topics,
  public.categories,
  public.tags,
  public.articles,
  public.article_topics,
  public.article_tags,
  public.article_references,
  public.article_files,
  public.media_files,
  public.projects,
  public.project_tags,
  public.settings
to web_admin;
grant update on public.site_profile to web_admin;
grant select on public.media_files to web_admin;
grant select, update on public.profiles to web_admin;
grant select, insert on public.activity_logs to web_admin;
grant select, update, delete on public.contacts to web_admin;

-- Server tasks: only storing contact-form messages.
grant insert on public.contacts to web_server;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.articles enable row level security;
alter table public.article_topics enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_references enable row level security;
alter table public.article_files enable row level security;
alter table public.media_files enable row level security;
alter table public.projects enable row level security;
alter table public.project_tags enable row level security;
alter table public.site_profile enable row level security;
alter table public.settings enable row level security;
alter table public.activity_logs enable row level security;
alter table public.contacts enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "Users can read their own profile"
  on public.profiles for select to web_admin
  using (id = public.current_profile_id());

create policy "Admins can read all profiles"
  on public.profiles for select to web_admin
  using ((select public.is_admin()));

create policy "Admins can update profiles"
  on public.profiles for update to web_admin
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Taxonomy: public read, admin write
-- -----------------------------------------------------------------------------
create policy "Anyone can read topics"
  on public.topics for select to web_anon, web_admin using (true);
create policy "Admins can insert topics"
  on public.topics for insert to web_admin with check ((select public.is_admin()));
create policy "Admins can update topics"
  on public.topics for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete topics"
  on public.topics for delete to web_admin using ((select public.is_admin()));

create policy "Anyone can read categories"
  on public.categories for select to web_anon, web_admin using (true);
create policy "Admins can insert categories"
  on public.categories for insert to web_admin with check ((select public.is_admin()));
create policy "Admins can update categories"
  on public.categories for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete categories"
  on public.categories for delete to web_admin using ((select public.is_admin()));

create policy "Anyone can read tags"
  on public.tags for select to web_anon, web_admin using (true);
create policy "Staff can insert tags"
  on public.tags for insert to web_admin with check ((select public.is_staff()));
create policy "Admins can update tags"
  on public.tags for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete tags"
  on public.tags for delete to web_admin using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- articles
-- -----------------------------------------------------------------------------
create policy "Anyone can read published articles"
  on public.articles for select to web_anon, web_admin
  using (status = 'published' and deleted_at is null);

create policy "Staff can read all articles"
  on public.articles for select to web_admin
  using ((select public.is_staff()));

create policy "Staff can create articles"
  on public.articles for insert to web_admin
  with check (
    (select public.is_admin())
    or ((select public.is_staff()) and author_id = public.current_profile_id() and status <> 'published')
  );

create policy "Staff can update articles they may edit"
  on public.articles for update to web_admin
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and author_id = public.current_profile_id())
  )
  with check (
    (select public.is_admin())
    or ((select public.is_staff()) and author_id = public.current_profile_id() and status <> 'published')
  );

create policy "Admins can delete articles"
  on public.articles for delete to web_admin
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Article relations (topics, tags, references): visible when the parent
-- article is public; writable by whoever may edit the parent article.
-- -----------------------------------------------------------------------------
create policy "Anyone can read topics of published articles"
  on public.article_topics for select to web_anon, web_admin
  using (exists (
    select 1 from public.articles a
    where a.id = article_topics.article_id and a.status = 'published' and a.deleted_at is null
  ));
create policy "Staff can read all article topics"
  on public.article_topics for select to web_admin using ((select public.is_staff()));
create policy "Editors of the article can add topics"
  on public.article_topics for insert to web_admin
  with check (public.can_edit_article(article_id));
create policy "Editors of the article can remove topics"
  on public.article_topics for delete to web_admin
  using (public.can_edit_article(article_id));

create policy "Anyone can read tags of published articles"
  on public.article_tags for select to web_anon, web_admin
  using (exists (
    select 1 from public.articles a
    where a.id = article_tags.article_id and a.status = 'published' and a.deleted_at is null
  ));
create policy "Staff can read all article tags"
  on public.article_tags for select to web_admin using ((select public.is_staff()));
create policy "Editors of the article can add tags"
  on public.article_tags for insert to web_admin
  with check (public.can_edit_article(article_id));
create policy "Editors of the article can remove tags"
  on public.article_tags for delete to web_admin
  using (public.can_edit_article(article_id));

create policy "Anyone can read references of published articles"
  on public.article_references for select to web_anon, web_admin
  using (exists (
    select 1 from public.articles a
    where a.id = article_references.article_id and a.status = 'published' and a.deleted_at is null
  ));
create policy "Staff can read all references"
  on public.article_references for select to web_admin using ((select public.is_staff()));
create policy "Editors of the article can add references"
  on public.article_references for insert to web_admin
  with check (public.can_edit_article(article_id));
create policy "Editors of the article can update references"
  on public.article_references for update to web_admin
  using (public.can_edit_article(article_id))
  with check (public.can_edit_article(article_id));
create policy "Editors of the article can delete references"
  on public.article_references for delete to web_admin
  using (public.can_edit_article(article_id));

-- -----------------------------------------------------------------------------
-- article_files (metadata only; the objects live in a private bucket)
-- -----------------------------------------------------------------------------
create policy "Anyone can read public attachments of published articles"
  on public.article_files for select to web_anon, web_admin
  using (
    kind = 'article_attachment'
    and status = 'ready'
    and visibility = 'public'
    and exists (
      select 1 from public.articles a
      where a.id = article_files.article_id and a.status = 'published' and a.deleted_at is null
    )
  );

create policy "Anyone can read the current CV file"
  on public.article_files for select to web_anon, web_admin
  using (
    kind = 'cv'
    and status = 'ready'
    and exists (select 1 from public.site_profile sp where sp.cv_file_id = article_files.id)
  );

create policy "Staff can read all files"
  on public.article_files for select to web_admin using ((select public.is_staff()));
create policy "Admins can insert files"
  on public.article_files for insert to web_admin
  with check ((select public.is_admin()) and uploaded_by = public.current_profile_id());
create policy "Admins can update files"
  on public.article_files for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete files"
  on public.article_files for delete to web_admin using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- media_files (admin bookkeeping; images are served from public buckets)
-- -----------------------------------------------------------------------------
create policy "Staff can read media"
  on public.media_files for select to web_admin using ((select public.is_staff()));
create policy "Admins can insert media"
  on public.media_files for insert to web_admin
  with check ((select public.is_admin()) and uploaded_by = public.current_profile_id());
create policy "Admins can update media"
  on public.media_files for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete media"
  on public.media_files for delete to web_admin using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create policy "Anyone can read published projects"
  on public.projects for select to web_anon, web_admin using (status = 'published');
create policy "Staff can read all projects"
  on public.projects for select to web_admin using ((select public.is_staff()));
create policy "Admins can insert projects"
  on public.projects for insert to web_admin with check ((select public.is_admin()));
create policy "Admins can update projects"
  on public.projects for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete projects"
  on public.projects for delete to web_admin using ((select public.is_admin()));

create policy "Anyone can read tags of published projects"
  on public.project_tags for select to web_anon, web_admin
  using (exists (
    select 1 from public.projects p where p.id = project_tags.project_id and p.status = 'published'
  ));
create policy "Staff can read all project tags"
  on public.project_tags for select to web_admin using ((select public.is_staff()));
create policy "Admins can add project tags"
  on public.project_tags for insert to web_admin with check ((select public.is_admin()));
create policy "Admins can remove project tags"
  on public.project_tags for delete to web_admin using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- site_profile (public "About" data) and settings
-- -----------------------------------------------------------------------------
create policy "Anyone can read the site profile"
  on public.site_profile for select to web_anon, web_admin using (true);
create policy "Admins can update the site profile"
  on public.site_profile for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Anyone can read public settings"
  on public.settings for select to web_anon, web_admin using (is_public);
create policy "Admins can read all settings"
  on public.settings for select to web_admin using ((select public.is_admin()));
create policy "Admins can insert settings"
  on public.settings for insert to web_admin with check ((select public.is_admin()));
create policy "Admins can update settings"
  on public.settings for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete settings"
  on public.settings for delete to web_admin using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- activity_logs: append-only. No UPDATE/DELETE policies exist on purpose.
-- -----------------------------------------------------------------------------
create policy "Admins can read activity"
  on public.activity_logs for select to web_admin using ((select public.is_admin()));
create policy "Staff can append their own activity"
  on public.activity_logs for insert to web_admin
  with check ((select public.is_staff()) and actor_id = public.current_profile_id());

-- -----------------------------------------------------------------------------
-- contacts: visitors cannot touch this table. The server inserts as
-- web_server after validation, honeypot and rate limiting; web_server cannot
-- read the messages back.
-- -----------------------------------------------------------------------------
create policy "The server can store new messages"
  on public.contacts for insert to web_server
  with check (status = 'new');
create policy "Admins can read messages"
  on public.contacts for select to web_admin using ((select public.is_admin()));
create policy "Admins can update messages"
  on public.contacts for update to web_admin
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete messages"
  on public.contacts for delete to web_admin using ((select public.is_admin()));
