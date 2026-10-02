-- =============================================================================
-- 0300 · Helper functions and triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can read `profiles` without
-- recursing into its own RLS. They only ever answer questions about the
-- *current* JWT subject (auth.uid()), never about an arbitrary user id.
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('admin', 'editor'), false)
$$;

-- Admins can edit every article; editors only the ones they authored.
create or replace function public.can_edit_article(p_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or (
      public.is_staff()
      and exists (
        select 1 from public.articles a
        where a.id = p_article_id and a.author_id = (select auth.uid())
      )
    )
$$;

-- -----------------------------------------------------------------------------
-- slugify: lower-case ASCII slug. Mirrors src/utils/slugify.ts.
-- -----------------------------------------------------------------------------
create or replace function public.slugify(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    trim(both '-' from regexp_replace(
      translate(
        lower(coalesce(p_value, '')),
        'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
        'aaaaaaeeeeiiiiooooouuuucnyy'
      ),
      '[^a-z0-9]+', '-', 'g'
    )),
    120
  )
$$;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();
create trigger article_files_set_updated_at before update on public.article_files
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger site_profile_set_updated_at before update on public.site_profile
  for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Publication timestamps: the first publish sets published_at; unpublishing
-- keeps it so a re-publish preserves the original date.
-- -----------------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger articles_set_published_at before insert or update on public.articles
  for each row execute function public.set_published_at();
create trigger projects_set_published_at before insert or update on public.projects
  for each row execute function public.set_published_at();

-- A soft-deleted article can never stay featured.
create or replace function public.clear_featured_on_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null then
    new.featured := false;
  end if;
  return new;
end;
$$;

create trigger articles_clear_featured before insert or update on public.articles
  for each row execute function public.clear_featured_on_delete();

-- -----------------------------------------------------------------------------
-- New auth users get a profile WITHOUT any role. Public sign-up is disabled in
-- Supabase, but even if it were enabled a new account could not reach admin
-- data until a human grants a role.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Never allow the last active admin to be demoted or deactivated (lock-out
-- protection).
-- -----------------------------------------------------------------------------
create or replace function public.ensure_admin_remains()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.is_active
     and (new.role is distinct from 'admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles p
       where p.id <> old.id and p.role = 'admin' and p.is_active
     ) then
    raise exception 'At least one active admin must remain' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_ensure_admin_remains before update on public.profiles
  for each row execute function public.ensure_admin_remains();

-- Trigger functions are not meant to be called through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.ensure_admin_remains() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_published_at() from public, anon, authenticated;
revoke execute on function public.clear_featured_on_delete() from public, anon, authenticated;
