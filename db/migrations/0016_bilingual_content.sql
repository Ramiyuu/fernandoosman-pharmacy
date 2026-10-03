-- =============================================================================
-- 0016 · Bilingual content (English / Portuguese)
-- =============================================================================
-- Articles and projects: every language version is its own row, with its own
-- slug and its own status, linked to the first version through
-- translation_of_article_id / translation_of_project_id. A version group is
-- coalesce(translation_of_*_id, id) and holds at most one row per language.
--
-- Public listings take a locale: each group shows the version written in that
-- language and falls back to the other published version, so neither archive
-- looks empty while translations are still being written.
--
-- Topics, categories, the profile and settings keep their English base fields
-- and gain optional Portuguese ones; the app falls back to English when a
-- Portuguese field is empty.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema
-- -----------------------------------------------------------------------------
alter table public.projects
  add column language text not null default 'en' check (language in ('en', 'pt')),
  add column translation_of_project_id uuid references public.projects (id) on delete set null,
  add constraint projects_translation_not_self check (translation_of_project_id is null or translation_of_project_id <> id);
create index projects_translation_idx on public.projects (translation_of_project_id);

alter table public.topics
  add column name_pt text not null default '' check (char_length(name_pt) <= 80),
  add column description_pt text not null default '' check (char_length(description_pt) <= 500);

alter table public.categories
  add column name_pt text not null default '' check (char_length(name_pt) <= 80),
  add column description_pt text not null default '' check (char_length(description_pt) <= 500);

-- {"pt": {"headline": "…", "short_bio": "…", …}}. Entries inside education,
-- experience, skills, certifications and languages carry their own *_pt keys.
alter table public.site_profile
  add column translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and octet_length(translations::text) <= 65536);

-- One version per language in each group (trash excluded for articles).
create unique index articles_group_language_idx
  on public.articles ((coalesce(translation_of_article_id, id)), language) where deleted_at is null;
create unique index projects_group_language_idx
  on public.projects ((coalesce(translation_of_project_id, id)), language);

-- -----------------------------------------------------------------------------
-- Version links always point at the first version of a group, in another
-- language, and never at a row that is itself a translation (no chains).
-- Errors use SQLSTATE FOT01 so the app can explain them (src/lib/db-errors.ts).
-- -----------------------------------------------------------------------------
create or replace function public.check_article_translation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.articles%rowtype;
begin
  if new.translation_of_article_id is null then
    if tg_op = 'UPDATE' and new.language is distinct from old.language and exists (
      select 1 from public.articles o
      where o.translation_of_article_id = new.id and o.language = new.language and o.deleted_at is null
    ) then
      raise exception 'Another version of this article already uses that language.' using errcode = 'FOT01';
    end if;
    return new;
  end if;

  select * into v_parent from public.articles where id = new.translation_of_article_id;
  if not found then
    return new; -- the foreign key reports a missing row
  end if;
  if v_parent.translation_of_article_id is not null then
    raise exception 'Link a translation to the original article, not to another translation.' using errcode = 'FOT01';
  end if;
  if v_parent.language = new.language then
    raise exception 'A translation must be in a different language from the original.' using errcode = 'FOT01';
  end if;
  if exists (select 1 from public.articles o where o.translation_of_article_id = new.id) then
    raise exception 'This article already has translations, so it cannot become a translation itself.' using errcode = 'FOT01';
  end if;
  if new.deleted_at is null and exists (
    select 1 from public.articles o
    where o.translation_of_article_id = new.translation_of_article_id
      and o.language = new.language and o.id <> new.id and o.deleted_at is null
  ) then
    raise exception 'The original article already has a version in this language.' using errcode = 'FOT01';
  end if;
  return new;
end;
$$;

create trigger articles_check_translation
  before insert or update of translation_of_article_id, language, deleted_at on public.articles
  for each row execute function public.check_article_translation();

create or replace function public.check_project_translation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.projects%rowtype;
begin
  if new.translation_of_project_id is null then
    if tg_op = 'UPDATE' and new.language is distinct from old.language and exists (
      select 1 from public.projects o where o.translation_of_project_id = new.id and o.language = new.language
    ) then
      raise exception 'Another version of this project already uses that language.' using errcode = 'FOT01';
    end if;
    return new;
  end if;

  select * into v_parent from public.projects where id = new.translation_of_project_id;
  if not found then
    return new;
  end if;
  if v_parent.translation_of_project_id is not null then
    raise exception 'Link a translation to the original project, not to another translation.' using errcode = 'FOT01';
  end if;
  if v_parent.language = new.language then
    raise exception 'A translation must be in a different language from the original.' using errcode = 'FOT01';
  end if;
  if exists (select 1 from public.projects o where o.translation_of_project_id = new.id) then
    raise exception 'This project already has translations, so it cannot become a translation itself.' using errcode = 'FOT01';
  end if;
  if exists (
    select 1 from public.projects o
    where o.translation_of_project_id = new.translation_of_project_id and o.language = new.language and o.id <> new.id
  ) then
    raise exception 'The original project already has a version in this language.' using errcode = 'FOT01';
  end if;
  return new;
end;
$$;

create trigger projects_check_translation
  before insert or update of translation_of_project_id, language on public.projects
  for each row execute function public.check_project_translation();

-- -----------------------------------------------------------------------------
-- Which version a visitor sees: the one in their locale, or, when that one is
-- not published, the version passed in. NULL locale means "no preference".
-- -----------------------------------------------------------------------------
create or replace function public.is_preferred_article(p_group uuid, p_language text, p_locale text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_locale is null or p_language = p_locale or not exists (
    select 1 from public.articles o
    where (o.id = p_group or o.translation_of_article_id = p_group)
      and o.language = p_locale and o.status = 'published' and o.deleted_at is null
  )
$$;

create or replace function public.is_preferred_project(p_group uuid, p_language text, p_locale text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_locale is null or p_language = p_locale or not exists (
    select 1 from public.projects o
    where (o.id = p_group or o.translation_of_project_id = p_group)
      and o.language = p_locale and o.status = 'published'
  )
$$;

-- -----------------------------------------------------------------------------
-- Cards and details (same signatures; Portuguese taxonomy names added)
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
    'translation_group', coalesce(a.translation_of_article_id, a.id),
    'reading_time', a.reading_time,
    'status', a.status,
    'featured', a.featured,
    'published_at', a.published_at,
    'updated_at', a.updated_at,
    'author_name', (select pa.display_name from public.public_authors pa where pa.id = a.author_id),
    'category', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'name_pt', c.name_pt, 'slug', c.slug)
      from public.categories c where c.id = a.category_id
    ),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'name_pt', t.name_pt, 'slug', t.slug, 'icon', t.icon)
        order by t.sort_order, t.name)
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

create or replace function public.article_detail_json(p_article_id uuid, p_include_private_files boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.article_card_json(a.id) || jsonb_build_object(
    'content', a.content,
    'doi', a.doi, 'pmid', a.pmid, 'og_image_path', a.og_image_path,
    'external_url', a.external_url,
    'seo_title', a.seo_title,
    'seo_description', a.seo_description,
    'created_at', a.created_at,
    'deleted_at', a.deleted_at,
    'references', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'authors', r.authors, 'journal', r.journal,
        'year', r.year, 'doi', r.doi, 'url', r.url, 'pmid', r.pmid, 'volume', r.volume, 'issue', r.issue, 'pages', r.pages
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
        and (o.id = coalesce(a.translation_of_article_id, a.id)
          or o.translation_of_article_id = coalesce(a.translation_of_article_id, a.id))
      order by o.published_at
      limit 1
    ),
    -- Other groups sharing a topic, each shown in this article's language when available.
    'related', coalesce((
      select jsonb_agg(public.article_card_json(rel.id) order by rel.shared desc, rel.published_at desc)
      from (
        select o.id, o.published_at, count(*) as shared
        from public.articles o
        join public.article_topics ot on ot.article_id = o.id
        where o.status = 'published'
          and o.deleted_at is null
          and coalesce(o.translation_of_article_id, o.id) <> coalesce(a.translation_of_article_id, a.id)
          and public.is_preferred_article(coalesce(o.translation_of_article_id, o.id), o.language, a.language)
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
    'language', p.language,
    'translation_group', coalesce(p.translation_of_project_id, p.id),
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

create or replace function public.get_project_by_slug(p_slug text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.project_card_json(p.id) || jsonb_build_object(
    'content', p.content,
    'gallery', p.gallery,
    'links', p.links,
    'translation', (
      select jsonb_build_object('slug', o.slug, 'title', o.title, 'language', o.language)
      from public.projects o
      where o.status = 'published'
        and o.id <> p.id
        and o.language <> p.language
        and (o.id = coalesce(p.translation_of_project_id, p.id)
          or o.translation_of_project_id = coalesce(p.translation_of_project_id, p.id))
      limit 1
    )
  )
  from public.projects p
  where p.slug = p_slug and p.status = 'published'
$$;

-- -----------------------------------------------------------------------------
-- Locale-aware listings (signatures change, so the old versions are dropped)
-- -----------------------------------------------------------------------------
drop function public.get_published_articles(text, text, text, text, integer, integer, integer);
drop function public.filter_published_articles(text, text, text, text, integer);
drop function public.get_featured_article();
drop function public.get_article_filter_options();
drop function public.get_topics_with_counts();
drop function public.get_public_metrics();
drop function public.get_published_projects(integer, integer);
drop function public.search_content(text, integer, integer);

create function public.filter_published_articles(
  p_topic text default null,
  p_category text default null,
  p_tag text default null,
  p_language text default null,
  p_year integer default null,
  p_locale text default null
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
    and (p_language is not null or public.is_preferred_article(coalesce(a.translation_of_article_id, a.id), a.language, p_locale))
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

create function public.get_published_articles(
  p_topic text default null,
  p_category text default null,
  p_tag text default null,
  p_language text default null,
  p_year integer default null,
  p_limit integer default 12,
  p_offset integer default 0,
  p_locale text default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with filtered as (
    select f.id, f.published_at
    from public.filter_published_articles(p_topic, p_category, p_tag, p_language, p_year, p_locale) f
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

-- The featured flag lives on one version; visitors get their own language's version of it.
create function public.get_featured_article(p_locale text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with featured as (
    select a.id, coalesce(a.translation_of_article_id, a.id) as grp
    from public.articles a
    where a.featured and a.status = 'published' and a.deleted_at is null
    limit 1
  )
  select public.article_card_json(coalesce((
    select o.id from public.articles o
    where (o.id = featured.grp or o.translation_of_article_id = featured.grp)
      and o.language = p_locale and o.status = 'published' and o.deleted_at is null
    limit 1
  ), featured.id))
  from featured
$$;

create function public.get_article_filter_options(p_locale text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with published as (
    select a.*
    from public.articles a
    where a.status = 'published' and a.deleted_at is null
      and public.is_preferred_article(coalesce(a.translation_of_article_id, a.id), a.language, p_locale)
  )
  select jsonb_build_object(
    'years', coalesce((
      select jsonb_agg(y.year order by y.year desc)
      from (select distinct extract(year from p.published_at at time zone 'UTC')::integer as year from published p) y
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(l.language order by l.language)
      from (
        select distinct a.language from public.articles a where a.status = 'published' and a.deleted_at is null
      ) l
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'name_pt', c.name_pt, 'slug', c.slug, 'count', c.n)
        order by c.sort_order, c.name)
      from (
        select c.name, c.name_pt, c.slug, c.sort_order, count(p.id) as n
        from public.categories c join published p on p.category_id = c.id
        group by c.id
      ) c
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'name_pt', t.name_pt, 'slug', t.slug, 'count', t.n)
        order by t.sort_order, t.name)
      from (
        select t.name, t.name_pt, t.slug, t.sort_order, count(p.id) as n
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

create function public.get_topics_with_counts(p_locale text default null)
returns table (
  id uuid,
  name text,
  name_pt text,
  slug text,
  description text,
  description_pt text,
  icon text,
  sort_order integer,
  article_count bigint
)
language sql
stable
set search_path = ''
as $$
  select
    t.id, t.name, t.name_pt, t.slug::text, t.description, t.description_pt, t.icon, t.sort_order,
    (
      select count(*)
      from public.article_topics atp
      join public.articles a on a.id = atp.article_id
      where atp.topic_id = t.id and a.status = 'published' and a.deleted_at is null
        and public.is_preferred_article(coalesce(a.translation_of_article_id, a.id), a.language, p_locale)
    ) as article_count
  from public.topics t
  order by t.sort_order, t.name
$$;

-- Every number is computed from the database. A work published in both
-- languages counts once (one version per group is "preferred").
create function public.get_public_metrics(p_locale text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with published as (
    select a.id, a.category_id, a.published_at, a.title, a.slug
    from public.articles a
    where a.status = 'published' and a.deleted_at is null
      and public.is_preferred_article(coalesce(a.translation_of_article_id, a.id), a.language, coalesce(p_locale, 'en'))
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
    'data_projects', (
      select count(distinct coalesce(pr.translation_of_project_id, pr.id))
      from public.projects pr where pr.status = 'published'
    ),
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

create function public.get_published_projects(
  p_limit integer default 12,
  p_offset integer default 0,
  p_locale text default null
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
      and public.is_preferred_project(coalesce(p.translation_of_project_id, p.id), p.language, p_locale)
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

-- Full-text search across every published version; each matching group is
-- returned once, as the version in the visitor's language when it exists.
create function public.search_content(
  p_query text,
  p_limit integer default 10,
  p_offset integer default 0,
  p_locale text default null
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
      a.language,
      coalesce(a.translation_of_article_id, a.id) as grp,
      a.published_at,
      ts_rank(a.search_vector, v_tsquery)
        + case when exists (
            select 1 from public.article_tags atg join public.tags tg on tg.id = atg.tag_id
            where atg.article_id = a.id and tg.name ilike v_like
          ) then 0.4 else 0 end
        + case when exists (
            select 1 from public.article_topics atp join public.topics t on t.id = atp.topic_id
            where atp.article_id = a.id and (t.name ilike v_like or t.name_pt ilike v_like)
          ) then 0.3 else 0 end
        + case when exists (
            select 1 from public.categories c
            where c.id = a.category_id and (c.name ilike v_like or c.name_pt ilike v_like)
          ) then 0.2 else 0 end
        as rank
    from public.articles a
    where a.status = 'published'
      and a.deleted_at is null
      and (
        a.search_vector @@ v_tsquery
        or exists (select 1 from public.article_references r where r.article_id = a.id and r.search_vector @@ v_tsquery)
        or exists (
          select 1 from public.article_tags atg join public.tags tg on tg.id = atg.tag_id
          where atg.article_id = a.id and tg.name ilike v_like
        )
        or exists (
          select 1 from public.article_topics atp join public.topics t on t.id = atp.topic_id
          where atp.article_id = a.id and (t.name ilike v_like or t.name_pt ilike v_like)
        )
        or exists (
          select 1 from public.categories c
          where c.id = a.category_id and (c.name ilike v_like or c.name_pt ilike v_like)
        )
      )
  ),
  grouped as (
    select
      m.grp,
      max(m.rank) as rank,
      (array_agg(m.id order by (m.language = p_locale) desc, m.rank desc))[1] as matched_id
    from matches m
    group by m.grp
  ),
  resolved as (
    select
      g.rank,
      coalesce((
        select o.id from public.articles o
        where (o.id = g.grp or o.translation_of_article_id = g.grp)
          and o.language = p_locale and o.status = 'published' and o.deleted_at is null
        limit 1
      ), g.matched_id) as id
    from grouped g
  ),
  page as (
    select r.id, r.rank, a.published_at
    from resolved r join public.articles a on a.id = r.id
    order by r.rank desc, a.published_at desc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from grouped),
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
          and public.is_preferred_project(coalesce(p.translation_of_project_id, p.id), p.language, p_locale)
        order by rank desc
        limit 5
      ) pm
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- Sitemap: every published version, with its language and group so the
-- sitemap can list hreflang alternates.
create or replace function public.get_sitemap_entries()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'articles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', a.slug, 'updated_at', a.updated_at, 'language', a.language,
        'group', coalesce(a.translation_of_article_id, a.id)
      ) order by a.published_at desc)
      from public.articles a where a.status = 'published' and a.deleted_at is null
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', p.slug, 'updated_at', p.updated_at, 'language', p.language,
        'group', coalesce(p.translation_of_project_id, p.id)
      ) order by p.published_at desc)
      from public.projects p where p.status = 'published'
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug, 'updated_at', t.updated_at) order by t.sort_order)
      from public.topics t
    ), '[]'::jsonb)
  )
$$;

-- -----------------------------------------------------------------------------
-- Admin: projects keep their language; new versions are created by copying.
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
      featured, sort_order, author_id, language
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
      public.current_profile_id(),
      coalesce(nullif(p_data ->> 'language', ''), 'en')
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
      sort_order = coalesce((p_data ->> 'sort_order')::integer, 0),
      language = coalesce(nullif(p_data ->> 'language', ''), language)
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

-- Copies an article (text, references, topics, tags, cover) into a new draft
-- in another language. PDFs are not copied: each file belongs to one article.
-- Returns the existing version instead when the group already has one.
create or replace function public.admin_create_article_translation(p_source_id uuid, p_language text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_source public.articles%rowtype;
  v_root uuid;
  v_existing uuid;
  v_id uuid;
  v_base text;
  v_slug text;
  v_suffix integer := 1;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_language is null or p_language not in ('en', 'pt') then
    raise exception 'Unsupported language.' using errcode = '22023';
  end if;

  select * into v_source from public.articles where id = p_source_id and deleted_at is null;
  if not found then
    raise exception 'Article not found' using errcode = 'P0002';
  end if;
  if v_source.language = p_language then
    raise exception 'The article is already written in this language.' using errcode = 'FOT01';
  end if;

  v_root := coalesce(v_source.translation_of_article_id, v_source.id);
  select o.id into v_existing
  from public.articles o
  where (o.id = v_root or o.translation_of_article_id = v_root) and o.language = p_language and o.deleted_at is null
  limit 1;
  if v_existing is not null then
    return jsonb_build_object('id', v_existing, 'created', false);
  end if;

  v_base := left(v_source.slug || '-' || p_language, 100);
  v_slug := v_base;
  while exists (select 1 from public.articles a where a.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.articles (
    title, slug, subtitle, excerpt, content, content_text, cover_image_path, cover_image_alt, status, featured,
    language, translation_of_article_id, category_id, doi, pmid, og_image_path, external_url,
    seo_title, seo_description, reading_time, author_id
  )
  values (
    v_source.title, v_slug, v_source.subtitle, v_source.excerpt, v_source.content, v_source.content_text,
    v_source.cover_image_path, v_source.cover_image_alt, 'draft', false,
    p_language, v_root, v_source.category_id, v_source.doi, v_source.pmid, v_source.og_image_path, v_source.external_url,
    v_source.seo_title, v_source.seo_description, v_source.reading_time, public.current_profile_id()
  )
  returning id into v_id;

  insert into public.article_topics (article_id, topic_id)
  select v_id, atp.topic_id from public.article_topics atp where atp.article_id = v_source.id;
  insert into public.article_tags (article_id, tag_id)
  select v_id, atg.tag_id from public.article_tags atg where atg.article_id = v_source.id;
  insert into public.article_references (article_id, position, title, authors, journal, year, doi, url, pmid, volume, issue, pages)
  select v_id, r.position, r.title, r.authors, r.journal, r.year, r.doi, r.url, r.pmid, r.volume, r.issue, r.pages
  from public.article_references r where r.article_id = v_source.id;

  return jsonb_build_object('id', v_id, 'created', true);
end;
$$;

create or replace function public.admin_create_project_translation(p_source_id uuid, p_language text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_source public.projects%rowtype;
  v_root uuid;
  v_existing uuid;
  v_id uuid;
  v_base text;
  v_slug text;
  v_suffix integer := 1;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_language is null or p_language not in ('en', 'pt') then
    raise exception 'Unsupported language.' using errcode = '22023';
  end if;

  select * into v_source from public.projects where id = p_source_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  if v_source.language = p_language then
    raise exception 'The project is already written in this language.' using errcode = 'FOT01';
  end if;

  v_root := coalesce(v_source.translation_of_project_id, v_source.id);
  select o.id into v_existing
  from public.projects o
  where (o.id = v_root or o.translation_of_project_id = v_root) and o.language = p_language
  limit 1;
  if v_existing is not null then
    return jsonb_build_object('id', v_existing, 'created', false);
  end if;

  v_base := left(v_source.slug || '-' || p_language, 100);
  v_slug := v_base;
  while exists (select 1 from public.projects p where p.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.projects (
    title, slug, summary, content, content_text, status, progress, cover_image_path, cover_image_alt, gallery,
    repository_url, live_url, links, technologies, started_on, completed_on, featured, sort_order, author_id,
    language, translation_of_project_id
  )
  values (
    v_source.title, v_slug, v_source.summary, v_source.content, v_source.content_text, 'draft', v_source.progress,
    v_source.cover_image_path, v_source.cover_image_alt, v_source.gallery, v_source.repository_url, v_source.live_url,
    v_source.links, v_source.technologies, v_source.started_on, v_source.completed_on, v_source.featured,
    v_source.sort_order, public.current_profile_id(), p_language, v_root
  )
  returning id into v_id;

  insert into public.project_tags (project_id, tag_id)
  select v_id, pt.tag_id from public.project_tags pt where pt.project_id = v_source.id;

  return jsonb_build_object('id', v_id, 'created', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Execution privileges (nothing is executable by PUBLIC, see 0001; trigger
-- functions need no grant)
-- -----------------------------------------------------------------------------
grant execute on function public.is_preferred_article(uuid, text, text) to web_anon, web_admin;
grant execute on function public.is_preferred_project(uuid, text, text) to web_anon, web_admin;
grant execute on function public.filter_published_articles(text, text, text, text, integer, text) to web_anon, web_admin;
grant execute on function public.get_published_articles(text, text, text, text, integer, integer, integer, text) to web_anon, web_admin;
grant execute on function public.get_featured_article(text) to web_anon, web_admin;
grant execute on function public.get_article_filter_options(text) to web_anon, web_admin;
grant execute on function public.get_topics_with_counts(text) to web_anon, web_admin;
grant execute on function public.get_public_metrics(text) to web_anon, web_admin;
grant execute on function public.get_published_projects(integer, integer, text) to web_anon, web_admin;
grant execute on function public.search_content(text, integer, integer, text) to web_anon, web_admin;
grant execute on function public.admin_create_article_translation(uuid, text) to web_admin;
grant execute on function public.admin_create_project_translation(uuid, text) to web_admin;
