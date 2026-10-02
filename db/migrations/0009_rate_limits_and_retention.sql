-- =============================================================================
-- 0009 · Rate limiting and data retention
-- =============================================================================
-- Both run as web_server through SECURITY DEFINER functions: the website can
-- count attempts and purge expired data, but cannot read or edit the tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fixed-window rate limiting shared by every instance of the site. Keys are an
-- HMAC of the client identifier (see src/lib/security/rate-limit.ts): IP
-- addresses and e-mail addresses are never stored in clear text.
-- -----------------------------------------------------------------------------
create table private.rate_limits (
  key text primary key check (char_length(key) <= 200),
  hits integer not null,
  window_started_at timestamptz not null
);

create or replace function private.consume_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
  v_started timestamptz;
  v_window interval := make_interval(secs => greatest(coalesce(p_window_seconds, 1), 1));
begin
  insert into private.rate_limits as r (key, hits, window_started_at)
  values (p_key, 1, clock_timestamp())
  on conflict (key) do update set
    hits = case when r.window_started_at + v_window <= clock_timestamp() then 1 else r.hits + 1 end,
    window_started_at = case
      when r.window_started_at + v_window <= clock_timestamp() then clock_timestamp()
      else r.window_started_at
    end
  returning r.hits, r.window_started_at into v_hits, v_started;

  -- Opportunistic cleanup of finished windows (about one call in a hundred).
  if random() < 0.01 then
    delete from private.rate_limits where window_started_at < clock_timestamp() - interval '1 day';
  end if;

  allowed := v_hits <= p_max;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (v_started + v_window - clock_timestamp())))::integer)
  end;
  return next;
end;
$$;

-- -----------------------------------------------------------------------------
-- LGPD data minimisation: contact-form messages are personal data kept only to
-- reply. Messages older than the retention period are deleted automatically
-- (called when a message is stored and when the admin opens the inbox).
-- The period can be configured, but never below 30 days.
-- -----------------------------------------------------------------------------
create or replace function private.purge_expired_contacts(p_retention_days integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.contacts
    where created_at < now() - make_interval(days => greatest(coalesce(p_retention_days, 365), 30))
    returning 1
  )
  select count(*)::integer from deleted
$$;

grant execute on function private.consume_rate_limit(text, integer, integer) to web_server;
grant execute on function private.purge_expired_contacts(integer) to web_server;
