alter table public.article_references add column volume text not null default '' check(length(volume)<=40),
 add column issue text not null default '' check(length(issue)<=40), add column pages text not null default '' check(length(pages)<=80);
alter table public.articles add column pmid text check(pmid ~ '^[0-9]{1,9}$'),
 add column og_image_path text check(og_image_path ~ '^[a-z0-9/_-]+\.(jpg|png|webp|avif|gif)$');
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

  update public.articles set pmid = nullif(p_data->>'pmid',''), og_image_path = nullif(p_data->>'og_image_path',''),
    published_at = coalesce(nullif(p_data->>'published_at','')::timestamptz, published_at) where id = v_id;
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
  insert into public.article_references (article_id, position, title, authors, journal, year, doi, url, pmid, volume, issue, pages)
  select
    v_id,
    (r.ord - 1)::integer,
    r.item ->> 'title',
    coalesce(r.item ->> 'authors', ''),
    coalesce(r.item ->> 'journal', ''),
    nullif(r.item ->> 'year', '')::integer,
    nullif(r.item ->> 'doi', '')::public.doi,
    nullif(r.item ->> 'url', '')::public.http_url,
    nullif(r.item ->> 'pmid', ''),
    coalesce(r.item ->> 'volume',''), coalesce(r.item ->> 'issue',''), coalesce(r.item ->> 'pages','')
  from jsonb_array_elements(coalesce(p_references, '[]'::jsonb)) with ordinality as r(item, ord);

  select jsonb_build_object('id', a.id, 'slug', a.slug, 'status', a.status, 'updated_at', a.updated_at)
  into v_result
  from public.articles a
  where a.id = v_id;

  return v_result;
end;
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
