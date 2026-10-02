-- =============================================================================
-- 0007 · Public read functions
-- =============================================================================
-- All functions are SECURITY INVOKER (the default): they run with the
-- caller's privileges, so RLS still decides what each visitor can see. The
-- explicit `status = 'published'` filters below are for correctness of the
-- public listings (an admin calling them must not see drafts either), not the
-- security boundary.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Article card (listing shape)
-- -----------------------------------------------------------------------------
create or replace function public.article_card_json(p_article_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'slug', a.slug,
    'subtitle', a.subtitle,
    'excerpt', a.excerpt,
    'cover_image_path', a.cover_image_path,
    'cover_image_alt', a.cover_image_alt,
    'language', a.language,
    'reading_time', a.reading_time,
    'status', a.status,
    'featured', a.featured,
    'published_at', a.published_at,
    'updated_at', a.updated_at,
    'author_name', (select pa.display_name from public.public_authors pa where pa.id = a.author_id),
    'category', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
      from public.categories c where c.id = a.category_id
    ),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'icon', t.icon) order by t.sort_order, t.name)
      from public.article_topics atp
      join public.topics t on t.id = atp.topic_id
      where atp.article_id = a.id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('id', tg.id, 'name', tg.name, 'slug', tg.slug) order by tg.name)
      from public.article_tags atg
      join public.tags tg on tg.id = atg.tag_id
      where atg.article_id = a.id
    ), '[]'::jsonb)
  )
  from public.articles a
  where a.id = p_article_id
$$;

-- -----------------------------------------------------------------------------
-- Article detail (article page and private preview)
-- -----------------------------------------------------------------------------
create or replace function public.article_detail_json(p_article_id uuid, p_include_private_files boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.article_card_json(a.id) || jsonb_build_object(
    'content', a.content,
    'doi', a.doi,
    'external_url', a.external_url,
    'seo_title', a.seo_title,
    'seo_description', a.seo_description,
    'created_at', a.created_at,
    'deleted_at', a.deleted_at,
    'references', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'authors', r.authors, 'journal', r.journal,
        'year', r.year, 'doi', r.doi, 'url', r.url, 'pmid', r.pmid
      ) order by r.position, r.created_at)
      from public.article_references r
      where r.article_id = a.id
    ), '[]'::jsonb),
    -- RLS hides private files from visitors even if p_include_private_files is true.
    'files', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'original_filename', f.original_filename, 'label', f.label,
        'size_bytes', f.size_bytes, 'visibility', f.visibility
      ) order by f.created_at)
      from public.article_files f
      where f.article_id = a.id
        and f.kind = 'article_attachment'
        and f.status = 'ready'
        and (f.visibility = 'public' or p_include_private_files)
    ), '[]'::jsonb),
    'translation', (
      select jsonb_build_object('slug', o.slug, 'title', o.title, 'language', o.language)
      from public.articles o
      where o.status = 'published'
        and o.deleted_at is null
        and o.id <> a.id
        and o.language <> a.language
        and (o.id = a.translation_of_article_id or o.translation_of_article_id = a.id)
      order by o.published_at
      limit 1
    ),
    'related', coalesce((
      select jsonb_agg(public.article_card_json(rel.id) order by rel.shared desc, rel.published_at desc)
      from (
        select o.id, o.published_at, count(*) as shared
        from public.articles o
        join public.article_topics ot on ot.article_id = o.id
        where o.status = 'published'
          and o.deleted_at is null
          and o.id <> a.id
          and ot.topic_id in (select atp.topic_id from public.article_topics atp where atp.article_id = a.id)
        group by o.id, o.published_at
        order by shared desc, o.published_at desc
        limit 3
      ) rel
    ), '[]'::jsonb)
  )
  from public.articles a
  where a.id = p_article_id
$$;

create or replace function public.get_article_by_slug(p_slug text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.article_detail_json(a.id, false)
  from public.articles a
  where a.slug = p_slug and a.status = 'published' and a.deleted_at is null
$$;

-- -----------------------------------------------------------------------------
-- Published article listing with filters + pagination
-- -----------------------------------------------------------------------------
create or replace function public.filter_published_articles(
  p_topic text default null,
  p_category text default null,
  p_tag text default null,
  p_language text default null,
  p_year integer default null
)
returns table (id uuid, published_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select a.id, a.published_at
  from public.articles a
  where a.status = 'published'
    and a.deleted_at is null
    and (p_language is null or a.language = p_language)
    and (p_year is null or extract(year from a.published_at at time zone 'UTC')::integer = p_year)
    and (p_category is null or exists (
      select 1 from public.categories c where c.id = a.category_id and c.slug = p_category
    ))
    and (p_topic is null or exists (
      select 1 from public.article_topics atp join public.topics t on t.id = atp.topic_id
      where atp.article_id = a.id and t.slug = p_topic
    ))
    and (p_tag is null or exists (
      select 1 from public.article_tags atg join public.tags tg on tg.id = atg.tag_id
      where atg.article_id = a.id and tg.slug = p_tag
    ))
$$;

create or replace function public.get_published_articles(
  p_topic text default null,
  p_category text default null,
  p_tag text default null,
  p_language text default null,
  p_year integer default null,
  p_limit integer default 12,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with filtered as (
    select f.id, f.published_at
    from public.filter_published_articles(p_topic, p_category, p_tag, p_language, p_year) f
  ),
  page as (
    select filtered.id, filtered.published_at
    from filtered
    order by filtered.published_at desc, filtered.id
    limit least(greatest(coalesce(p_limit, 12), 1), 50)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(public.article_card_json(page.id) order by page.published_at desc, page.id)
      from page
    ), '[]'::jsonb)
  )
$$;

create or replace function public.get_featured_article()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.article_card_json(a.id)
  from public.articles a
  where a.featured and a.status = 'published' and a.deleted_at is null
  limit 1
$$;

-- Options for the /articles filter bar (only values that return results).
create or replace function public.get_article_filter_options()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with published as (
    select a.* from public.articles a where a.status = 'published' and a.deleted_at is null
  )
  select jsonb_build_object(
    'years', coalesce((
      select jsonb_agg(y.year order by y.year desc)
      from (select distinct extract(year from p.published_at at time zone 'UTC')::integer as year from published p) y
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(l.language order by l.language)
      from (select distinct p.language from published p) l
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug, 'count', c.n) order by c.sort_order, c.name)
      from (
        select c.name, c.slug, c.sort_order, count(p.id) as n
        from public.categories c join published p on p.category_id = c.id
        group by c.id
      ) c
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'slug', t.slug, 'count', t.n) order by t.sort_order, t.name)
      from (
        select t.name, t.slug, t.sort_order, count(p.id) as n
        from public.topics t
        join public.article_topics atp on atp.topic_id = t.id
        join published p on p.id = atp.article_id
        group by t.id
      ) t
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('name', tg.name, 'slug', tg.slug, 'count', tg.n) order by tg.n desc, tg.name)
      from (
        select tg.name, tg.slug, count(p.id) as n
        from public.tags tg
        join public.article_tags atg on atg.tag_id = tg.id
        join published p on p.id = atg.article_id
        group by tg.id
      ) tg
    ), '[]'::jsonb)
  )
$$;

-- -----------------------------------------------------------------------------
-- Topics with live article counts
-- -----------------------------------------------------------------------------
create or replace function public.get_topics_with_counts()
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  icon text,
  sort_order integer,
  article_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    t.id, t.name, t.slug::text, t.description, t.icon, t.sort_order,
    (
      select count(*)
      from public.article_topics atp
      join public.articles a on a.id = atp.article_id
      where atp.topic_id = t.id and a.status = 'published' and a.deleted_at is null
    ) as article_count
  from public.topics t
  order by t.sort_order, t.name
$$;

-- -----------------------------------------------------------------------------
-- Home page metrics — every number is computed from the database.
-- Category conventions: 'paper-review' and 'research-note' (see seed.sql).
-- -----------------------------------------------------------------------------
create or replace function public.get_public_metrics()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with published as (
    select a.id, a.category_id, a.published_at, a.title, a.slug
    from public.articles a
    where a.status = 'published' and a.deleted_at is null
  )
  select jsonb_build_object(
    'articles_published', (select count(*) from published),
    'paper_reviews', (
      select count(*) from published p join public.categories c on c.id = p.category_id
      where c.slug = 'paper-review'
    ),
    'research_notes', (
      select count(*) from published p join public.categories c on c.id = p.category_id
      where c.slug = 'research-note'
    ),
    'topics_covered', (
      select count(distinct atp.topic_id) from public.article_topics atp join published p on p.id = atp.article_id
    ),
    'data_projects', (select count(*) from public.projects pr where pr.status = 'published'),
    'references_reviewed', (
      select count(distinct lower(coalesce(r.doi::text, r.pmid, r.title)))
      from public.article_references r join published p on p.id = r.article_id
    ),
    'latest_publication', (
      select jsonb_build_object('title', p.title, 'slug', p.slug, 'published_at', p.published_at)
      from published p order by p.published_at desc limit 1
    ),
    'current_semester', (select sp.current_semester from public.site_profile sp where sp.id = 1),
    'total_semesters', (select sp.total_semesters from public.site_profile sp where sp.id = 1)
  )
$$;

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
create or replace function public.project_card_json(p_project_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'slug', p.slug,
    'summary', p.summary,
    'status', p.status,
    'progress', p.progress,
    'cover_image_path', p.cover_image_path,
    'cover_image_alt', p.cover_image_alt,
    'technologies', to_jsonb(p.technologies),
    'repository_url', p.repository_url,
    'live_url', p.live_url,
    'started_on', p.started_on,
    'completed_on', p.completed_on,
    'featured', p.featured,
    'published_at', p.published_at,
    'updated_at', p.updated_at,
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('id', tg.id, 'name', tg.name, 'slug', tg.slug) order by tg.name)
      from public.project_tags pt join public.tags tg on tg.id = pt.tag_id
      where pt.project_id = p.id
    ), '[]'::jsonb)
  )
  from public.projects p
  where p.id = p_project_id
$$;

create or replace function public.get_published_projects(
  p_limit integer default 12,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with filtered as (
    select p.id, p.featured, p.sort_order, p.published_at
    from public.projects p
    where p.status = 'published'
  ),
  page as (
    select * from filtered
    order by filtered.featured desc, filtered.sort_order, filtered.published_at desc, filtered.id
    limit least(greatest(coalesce(p_limit, 12), 1), 50)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((
      select jsonb_agg(public.project_card_json(page.id)
        order by page.featured desc, page.sort_order, page.published_at desc, page.id)
      from page
    ), '[]'::jsonb)
  )
$$;

create or replace function public.get_project_by_slug(p_slug text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.project_card_json(p.id) || jsonb_build_object(
    'content', p.content,
    'gallery', p.gallery,
    'links', p.links
  )
  from public.projects p
  where p.slug = p_slug and p.status = 'published'
$$;

-- -----------------------------------------------------------------------------
-- Full-text search across published articles (title, subtitle, excerpt,
-- content) plus tag/topic/category names, and published projects.
-- Input is reduced to alphanumeric terms before building a prefix tsquery, so
-- user input can never produce tsquery syntax errors.
-- -----------------------------------------------------------------------------
create or replace function public.build_prefix_tsquery(p_query text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case
    when count(term) = 0 then null
    else to_tsquery('simple'::regconfig, string_agg(term || ':*', ' & '))
  end
  from (
    select regexp_replace(lower(w), '[^a-z0-9áàâãäéèêëíìîïóòôõöúùûüçñ]+', '', 'g') as term
    from regexp_split_to_table(left(coalesce(p_query, ''), 200), '\s+') as w
    limit 8
  ) terms
  where term <> ''
$$;

create or replace function public.search_content(
  p_query text,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tsquery tsquery := public.build_prefix_tsquery(p_query);
  v_like text;
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  if v_tsquery is null then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb, 'projects', '[]'::jsonb);
  end if;

  -- Escape LIKE wildcards in user input.
  v_like := '%' || replace(replace(replace(btrim(left(p_query, 100)), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  with matches as (
    select
      a.id,
      a.published_at,
      ts_rank(a.search_vector, v_tsquery)
        + case when exists (
            select 1 from public.article_tags atg join public.tags tg on tg.id = atg.tag_id
            where atg.article_id = a.id and tg.name ilike v_like
          ) then 0.4 else 0 end
        + case when exists (
            select 1 from public.article_topics atp join public.topics t on t.id = atp.topic_id
            where atp.article_id = a.id and t.name ilike v_like
          ) then 0.3 else 0 end
        + case when exists (
            select 1 from public.categories c where c.id = a.category_id and c.name ilike v_like
          ) then 0.2 else 0 end
        as rank
    from public.articles a
    where a.status = 'published'
      and a.deleted_at is null
      and (
        a.search_vector @@ v_tsquery
        or exists (
          select 1 from public.article_tags atg join public.tags tg on tg.id = atg.tag_id
          where atg.article_id = a.id and tg.name ilike v_like
        )
        or exists (
          select 1 from public.article_topics atp join public.topics t on t.id = atp.topic_id
          where atp.article_id = a.id and t.name ilike v_like
        )
        or exists (
          select 1 from public.categories c where c.id = a.category_id and c.name ilike v_like
        )
      )
  ),
  page as (
    select * from matches
    order by matches.rank desc, matches.published_at desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'items', coalesce((
      select jsonb_agg(
        public.article_card_json(page.id) || jsonb_build_object(
          'headline', (
            select ts_headline(
              'simple'::regconfig,
              left(coalesce(nullif(a.content_text, ''), a.excerpt), 20000),
              v_tsquery,
              'StartSel=[[[, StopSel=]]], MaxWords=32, MinWords=14, MaxFragments=1'
            )
            from public.articles a where a.id = page.id
          ),
          'rank', page.rank
        )
        order by page.rank desc, page.published_at desc
      )
      from page
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(public.project_card_json(pm.id) order by pm.rank desc)
      from (
        select p.id, ts_rank(p.search_vector, v_tsquery) as rank
        from public.projects p
        where p.status = 'published' and p.search_vector @@ v_tsquery
        order by rank desc
        limit 5
      ) pm
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sitemap entries
-- -----------------------------------------------------------------------------
create or replace function public.get_sitemap_entries()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'articles', coalesce((
      select jsonb_agg(jsonb_build_object('slug', a.slug, 'updated_at', a.updated_at) order by a.published_at desc)
      from public.articles a where a.status = 'published' and a.deleted_at is null
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object('slug', p.slug, 'updated_at', p.updated_at) order by p.published_at desc)
      from public.projects p where p.status = 'published'
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug, 'updated_at', t.updated_at) order by t.sort_order)
      from public.topics t
    ), '[]'::jsonb)
  )
$$;

-- -----------------------------------------------------------------------------
-- Execution privileges (nothing is executable by PUBLIC, see 0001)
-- -----------------------------------------------------------------------------
grant execute on function public.article_card_json(uuid) to web_anon, web_admin;
grant execute on function public.article_detail_json(uuid, boolean) to web_anon, web_admin;
grant execute on function public.get_article_by_slug(text) to web_anon, web_admin;
grant execute on function public.filter_published_articles(text, text, text, text, integer) to web_anon, web_admin;
grant execute on function public.get_published_articles(text, text, text, text, integer, integer, integer) to web_anon, web_admin;
grant execute on function public.get_featured_article() to web_anon, web_admin;
grant execute on function public.get_article_filter_options() to web_anon, web_admin;
grant execute on function public.get_topics_with_counts() to web_anon, web_admin;
grant execute on function public.get_public_metrics() to web_anon, web_admin;
grant execute on function public.project_card_json(uuid) to web_anon, web_admin;
grant execute on function public.get_published_projects(integer, integer) to web_anon, web_admin;
grant execute on function public.get_project_by_slug(text) to web_anon, web_admin;
grant execute on function public.build_prefix_tsquery(text) to web_anon, web_admin;
grant execute on function public.search_content(text, integer, integer) to web_anon, web_admin;
grant execute on function public.get_sitemap_entries() to web_anon, web_admin;
