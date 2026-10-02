alter table public.article_references add column search_vector tsvector generated always as (
 to_tsvector('simple'::regconfig, coalesce(title,'') || ' ' || coalesce(authors,'') || ' ' || coalesce(journal,'') || ' ' || coalesce(doi::text,'') || ' ' || coalesce(pmid,''))
) stored;
create index article_references_search_idx on public.article_references using gin(search_vector);
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
        or exists (select 1 from public.article_references r where r.article_id = a.id and r.search_vector @@ v_tsquery)
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
