-- =============================================================================
-- 0008 · Admin functions
-- =============================================================================
-- SECURITY INVOKER: they run as the calling user, so every statement inside is
-- still checked by RLS. The explicit role checks give a clear error early.
-- Only web_admin may execute them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Save an article with its topics, tags and references in one transaction.
-- Returns the final (unique) slug so the editor can display it.
-- -----------------------------------------------------------------------------
create or replace function public.admin_save_article(
  p_id uuid,
  p_data jsonb,
  p_topic_ids uuid[] default '{}',
  p_tag_names text[] default '{}',
  p_references jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_base text;
  v_slug text;
  v_suffix integer := 1;
  v_name text;
  v_tag_slug text;
  v_tag_id uuid;
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_base := left(public.slugify(coalesce(nullif(p_data ->> 'slug', ''), nullif(p_data ->> 'title', ''), 'untitled')), 100);
  if v_base = '' then
    v_base := 'untitled';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.articles a where a.slug = v_slug and (v_id is null or a.id <> v_id)) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  -- Only one featured article at a time.
  if coalesce((p_data ->> 'featured')::boolean, false) then
    update public.articles set featured = false where featured and (v_id is null or id <> v_id);
  end if;

  if v_id is null then
    insert into public.articles (
      title, slug, subtitle, excerpt, content, content_text, cover_image_path, cover_image_alt,
      featured, language, translation_of_article_id, category_id, doi, external_url,
      seo_title, seo_description, reading_time, author_id, status
    )
    values (
      coalesce(p_data ->> 'title', ''),
      v_slug,
      coalesce(p_data ->> 'subtitle', ''),
      coalesce(p_data ->> 'excerpt', ''),
      coalesce(p_data -> 'content', '{"type":"doc","content":[]}'::jsonb),
      coalesce(p_data ->> 'content_text', ''),
      nullif(p_data ->> 'cover_image_path', ''),
      coalesce(p_data ->> 'cover_image_alt', ''),
      coalesce((p_data ->> 'featured')::boolean, false),
      coalesce(nullif(p_data ->> 'language', ''), 'en'),
      nullif(p_data ->> 'translation_of_article_id', '')::uuid,
      nullif(p_data ->> 'category_id', '')::uuid,
      nullif(p_data ->> 'doi', '')::public.doi,
      nullif(p_data ->> 'external_url', '')::public.http_url,
      coalesce(p_data ->> 'seo_title', ''),
      coalesce(p_data ->> 'seo_description', ''),
      greatest(coalesce((p_data ->> 'reading_time')::integer, 1), 1),
      public.current_profile_id(),
      'draft'
    )
    returning id into v_id;
  else
    update public.articles set
      title = coalesce(p_data ->> 'title', ''),
      slug = v_slug,
      subtitle = coalesce(p_data ->> 'subtitle', ''),
      excerpt = coalesce(p_data ->> 'excerpt', ''),
      content = coalesce(p_data -> 'content', '{"type":"doc","content":[]}'::jsonb),
      content_text = coalesce(p_data ->> 'content_text', ''),
      cover_image_path = nullif(p_data ->> 'cover_image_path', ''),
      cover_image_alt = coalesce(p_data ->> 'cover_image_alt', ''),
      featured = coalesce((p_data ->> 'featured')::boolean, false),
      language = coalesce(nullif(p_data ->> 'language', ''), 'en'),
      translation_of_article_id = nullif(p_data ->> 'translation_of_article_id', '')::uuid,
      category_id = nullif(p_data ->> 'category_id', '')::uuid,
      doi = nullif(p_data ->> 'doi', '')::public.doi,
      external_url = nullif(p_data ->> 'external_url', '')::public.http_url,
      seo_title = coalesce(p_data ->> 'seo_title', ''),
      seo_description = coalesce(p_data ->> 'seo_description', ''),
      reading_time = greatest(coalesce((p_data ->> 'reading_time')::integer, 1), 1)
    where id = v_id and deleted_at is null;

    if not found then
      raise exception 'Article not found' using errcode = 'P0002';
    end if;
  end if;

  -- Topics
  delete from public.article_topics where article_id = v_id;
  insert into public.article_topics (article_id, topic_id)
  select v_id, t.id from public.topics t where t.id = any (coalesce(p_topic_ids, '{}'))
  on conflict do nothing;

  -- Tags (created on the fly, matched by slug)
  delete from public.article_tags where article_id = v_id;
  foreach v_name in array coalesce(p_tag_names, '{}') loop
    v_name := left(btrim(v_name), 50);
    v_tag_slug := public.slugify(v_name);
    continue when v_name = '' or v_tag_slug = '';
    insert into public.tags (name, slug) values (v_name, v_tag_slug) on conflict (slug) do nothing;
    select t.id into v_tag_id from public.tags t where t.slug = v_tag_slug;
    insert into public.article_tags (article_id, tag_id) values (v_id, v_tag_id) on conflict do nothing;
  end loop;

  -- References (replaced as an ordered list)
  delete from public.article_references where article_id = v_id;
  insert into public.article_references (article_id, position, title, authors, journal, year, doi, url, pmid)
  select
    v_id,
    (r.ord - 1)::integer,
    r.item ->> 'title',
    coalesce(r.item ->> 'authors', ''),
    coalesce(r.item ->> 'journal', ''),
    nullif(r.item ->> 'year', '')::integer,
    nullif(r.item ->> 'doi', '')::public.doi,
    nullif(r.item ->> 'url', '')::public.http_url,
    nullif(r.item ->> 'pmid', '')
  from jsonb_array_elements(coalesce(p_references, '[]'::jsonb)) with ordinality as r(item, ord);

  select jsonb_build_object('id', a.id, 'slug', a.slug, 'status', a.status, 'updated_at', a.updated_at)
  into v_result
  from public.articles a
  where a.id = v_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Save a project with its tags.
-- -----------------------------------------------------------------------------
create or replace function public.admin_save_project(
  p_id uuid,
  p_data jsonb,
  p_tag_names text[] default '{}'
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_base text;
  v_slug text;
  v_suffix integer := 1;
  v_name text;
  v_tag_slug text;
  v_tag_id uuid;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_base := left(public.slugify(coalesce(nullif(p_data ->> 'slug', ''), nullif(p_data ->> 'title', ''), 'project')), 100);
  if v_base = '' then
    v_base := 'project';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.projects p where p.slug = v_slug and (v_id is null or p.id <> v_id)) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  if v_id is null then
    insert into public.projects (
      title, slug, summary, content, content_text, status, progress, cover_image_path, cover_image_alt,
      gallery, repository_url, live_url, links, technologies, started_on, completed_on,
      featured, sort_order, author_id
    )
    values (
      p_data ->> 'title',
      v_slug,
      coalesce(p_data ->> 'summary', ''),
      coalesce(p_data -> 'content', '{"type":"doc","content":[]}'::jsonb),
      coalesce(p_data ->> 'content_text', ''),
      coalesce(nullif(p_data ->> 'status', ''), 'draft')::public.content_status,
      coalesce(nullif(p_data ->> 'progress', ''), 'in_progress')::public.project_progress,
      nullif(p_data ->> 'cover_image_path', ''),
      coalesce(p_data ->> 'cover_image_alt', ''),
      coalesce(p_data -> 'gallery', '[]'::jsonb),
      nullif(p_data ->> 'repository_url', '')::public.http_url,
      nullif(p_data ->> 'live_url', '')::public.http_url,
      coalesce(p_data -> 'links', '[]'::jsonb),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_data -> 'technologies', '[]'::jsonb))), '{}'),
      nullif(p_data ->> 'started_on', '')::date,
      nullif(p_data ->> 'completed_on', '')::date,
      coalesce((p_data ->> 'featured')::boolean, false),
      coalesce((p_data ->> 'sort_order')::integer, 0),
      public.current_profile_id()
    )
    returning id into v_id;
  else
    update public.projects set
      title = p_data ->> 'title',
      slug = v_slug,
      summary = coalesce(p_data ->> 'summary', ''),
      content = coalesce(p_data -> 'content', '{"type":"doc","content":[]}'::jsonb),
      content_text = coalesce(p_data ->> 'content_text', ''),
      status = coalesce(nullif(p_data ->> 'status', ''), 'draft')::public.content_status,
      progress = coalesce(nullif(p_data ->> 'progress', ''), 'in_progress')::public.project_progress,
      cover_image_path = nullif(p_data ->> 'cover_image_path', ''),
      cover_image_alt = coalesce(p_data ->> 'cover_image_alt', ''),
      gallery = coalesce(p_data -> 'gallery', '[]'::jsonb),
      repository_url = nullif(p_data ->> 'repository_url', '')::public.http_url,
      live_url = nullif(p_data ->> 'live_url', '')::public.http_url,
      links = coalesce(p_data -> 'links', '[]'::jsonb),
      technologies = coalesce(array(select jsonb_array_elements_text(coalesce(p_data -> 'technologies', '[]'::jsonb))), '{}'),
      started_on = nullif(p_data ->> 'started_on', '')::date,
      completed_on = nullif(p_data ->> 'completed_on', '')::date,
      featured = coalesce((p_data ->> 'featured')::boolean, false),
      sort_order = coalesce((p_data ->> 'sort_order')::integer, 0)
    where id = v_id;

    if not found then
      raise exception 'Project not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.project_tags where project_id = v_id;
  foreach v_name in array coalesce(p_tag_names, '{}') loop
    v_name := left(btrim(v_name), 50);
    v_tag_slug := public.slugify(v_name);
    continue when v_name = '' or v_tag_slug = '';
    insert into public.tags (name, slug) values (v_name, v_tag_slug) on conflict (slug) do nothing;
    select t.id into v_tag_id from public.tags t where t.slug = v_tag_slug;
    insert into public.project_tags (project_id, tag_id) values (v_id, v_tag_id) on conflict do nothing;
  end loop;

  select jsonb_build_object('id', p.id, 'slug', p.slug, 'status', p.status, 'updated_at', p.updated_at)
  into v_result
  from public.projects p
  where p.id = v_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Dashboard figures
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'articles_published', (select count(*) from public.articles a where a.status = 'published' and a.deleted_at is null),
    'articles_draft', (select count(*) from public.articles a where a.status = 'draft' and a.deleted_at is null),
    'articles_archived', (select count(*) from public.articles a where a.status = 'archived' and a.deleted_at is null),
    'articles_deleted', (select count(*) from public.articles a where a.deleted_at is not null),
    'projects_total', (select count(*) from public.projects),
    'projects_published', (select count(*) from public.projects p where p.status = 'published'),
    'pdfs_total', (select count(*) from public.article_files f where f.status = 'ready'),
    'topics_total', (select count(*) from public.topics),
    'tags_total', (select count(*) from public.tags),
    'messages_new', (select count(*) from public.contacts c where c.status = 'new'),
    'last_publication', (
      select jsonb_build_object('id', a.id, 'title', a.title, 'slug', a.slug, 'published_at', a.published_at)
      from public.articles a
      where a.status = 'published' and a.deleted_at is null
      order by a.published_at desc
      limit 1
    ),
    'storage', jsonb_build_object(
      'documents_bytes', (select coalesce(sum(f.size_bytes), 0) from public.article_files f where f.status = 'ready'),
      'documents_count', (select count(*) from public.article_files f where f.status = 'ready'),
      'images_bytes', (select coalesce(sum(m.size_bytes), 0) from public.media_files m),
      'images_count', (select count(*) from public.media_files)
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- File listing for /admin/files with the related article.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_files(
  p_kind text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with filtered as (
    select f.*
    from public.article_files f
    where p_kind is null or f.kind::text = p_kind
  ),
  page as (
    select * from filtered
    order by filtered.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'kind', page.kind,
        'original_filename', page.original_filename,
        'label', page.label,
        'storage_path', page.storage_path,
        'mime_type', page.mime_type,
        'size_bytes', page.size_bytes,
        'visibility', page.visibility,
        'status', page.status,
        'created_at', page.created_at,
        'is_current_cv', exists (select 1 from public.site_profile sp where sp.cv_file_id = page.id),
        'article', (
          select jsonb_build_object('id', a.id, 'title', a.title, 'slug', a.slug, 'status', a.status, 'deleted_at', a.deleted_at)
          from public.articles a where a.id = page.article_id
        )
      ) order by page.created_at desc)
      from page
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tag usage for /admin/tags
-- -----------------------------------------------------------------------------
create or replace function public.admin_tag_usage()
returns table (
  id uuid,
  name text,
  slug text,
  created_at timestamptz,
  article_count bigint,
  project_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    t.id, t.name, t.slug::text, t.created_at,
    (select count(*) from public.article_tags atg where atg.tag_id = t.id),
    (select count(*) from public.project_tags pt where pt.tag_id = t.id)
  from public.tags t
  where public.is_staff()
  order by t.name
$$;

-- -----------------------------------------------------------------------------
-- Execution privileges
-- -----------------------------------------------------------------------------
grant execute on function public.admin_save_article(uuid, jsonb, uuid[], text[], jsonb) to web_admin;
grant execute on function public.admin_save_project(uuid, jsonb, text[]) to web_admin;
grant execute on function public.admin_dashboard_stats() to web_admin;
grant execute on function public.admin_list_files(text, integer, integer) to web_admin;
grant execute on function public.admin_tag_usage() to web_admin;
