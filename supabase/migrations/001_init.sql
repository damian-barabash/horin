-- HORIN backend: CMS (texts + photos), contact inbox, cookieless analytics.
-- Applied to project bprgedjtklowtmspimtr. Idempotent where practical.

-- ---------- admins ----------

create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- coalesce: someone missing from admins must read as FALSE, never NULL
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select true from public.admins a where a.id = (select auth.uid())),
    false
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins
  for select to authenticated using (id = (select auth.uid()));

-- ---------- texts (overrides of the built-in dictionary) ----------

create table if not exists public.texts (
  key text primary key check (length(key) between 1 and 80),
  pl text check (pl is null or length(pl) <= 8000),
  en text check (en is null or length(en) <= 8000),
  -- the PL text the EN version was translated from (stale-translation badge)
  en_src text,
  updated_at timestamptz not null default now()
);
alter table public.texts enable row level security;

drop policy if exists texts_read on public.texts;
create policy texts_read on public.texts for select to anon, authenticated using (true);
drop policy if exists texts_write on public.texts;
create policy texts_write on public.texts for all to authenticated
  using (public.is_admin() is true) with check (public.is_admin() is true);

-- ---------- photos ----------

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  collection text not null check (collection in ('concrete', 'dawid')),
  section int not null default 1 check (section between 1 and 12),
  sort int not null default 0,
  src text not null check (length(src) <= 500),
  full_src text not null check (length(full_src) <= 500),
  w int,
  h int,
  created_at timestamptz not null default now()
);
create index if not exists photos_order on public.photos (collection, section, sort);
alter table public.photos enable row level security;

drop policy if exists photos_read on public.photos;
create policy photos_read on public.photos for select to anon, authenticated using (true);
drop policy if exists photos_write on public.photos;
create policy photos_write on public.photos for all to authenticated
  using (public.is_admin() is true) with check (public.is_admin() is true);

-- ---------- contact inbox ----------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text,
  message text not null,
  lang text,
  page text,
  sender text, -- daily hash of the sender address, rate limiting only
  read_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_created on public.messages (created_at desc);
alter table public.messages enable row level security;

drop policy if exists messages_admin on public.messages;
create policy messages_admin on public.messages for all to authenticated
  using (public.is_admin() is true) with check (public.is_admin() is true);

-- ---------- analytics ----------

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  day date not null default current_date,
  page text not null,
  lang text,
  device text,
  country text,
  ref text,
  visitor text not null,
  created_at timestamptz not null default now()
);
create index if not exists page_views_day on public.page_views (day);
alter table public.page_views enable row level security;

drop policy if exists page_views_admin on public.page_views;
create policy page_views_admin on public.page_views for select to authenticated
  using (public.is_admin() is true);

-- rotating salt: visitor hashes cannot be linked across days
create table if not exists public.daily_salt (
  day date primary key,
  salt text not null
);
alter table public.daily_salt enable row level security; -- no policies: definer-only

create or replace function public.visitor_hash()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip text := coalesce(h->>'cf-connecting-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1), '');
  s text;
begin
  insert into public.daily_salt (day, salt)
    values (current_date, gen_random_uuid()::text)
    on conflict (day) do nothing;
  delete from public.daily_salt where day < current_date - 1;
  select salt into s from public.daily_salt where day = current_date;
  return encode(sha256(convert_to(s || '|' || ip || '|' || coalesce(h->>'user-agent', ''), 'utf8')), 'hex');
end;
$$;
revoke all on function public.visitor_hash() from public, anon, authenticated;

create or replace function public.track_view(p_page text, p_lang text default null, p_device text default null, p_ref text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ua text := coalesce(h->>'user-agent', '');
begin
  if p_page not in ('index', 'dawid', 'contact') then return; end if;
  if ua = '' or ua ~* '(bot|crawl|spider|headless|lighthouse|preview|monitor)' then return; end if;
  insert into public.page_views (page, lang, device, country, ref, visitor)
  values (
    p_page,
    case when p_lang in ('en', 'pl') then p_lang end,
    case when p_device in ('mobile', 'desktop') then p_device end,
    nullif(left(coalesce(h->>'cf-ipcountry', ''), 2), ''),
    nullif(left(coalesce(p_ref, ''), 120), ''),
    public.visitor_hash()
  );
end;
$$;
revoke all on function public.track_view(text, text, text, text) from public;
grant execute on function public.track_view(text, text, text, text) to anon, authenticated;

create or replace function public.submit_message(
  p_name text, p_email text, p_topic text, p_message text,
  p_lang text default null, p_page text default null, p_hp text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  who text := public.visitor_hash();
begin
  -- honeypot: bots fill the hidden field; pretend it worked
  if coalesce(p_hp, '') <> '' then return; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'bad_name'; end if;
  if coalesce(p_email, '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(p_email) > 200 then raise exception 'bad_email'; end if;
  if length(trim(coalesce(p_message, ''))) not between 1 and 5000 then raise exception 'bad_message'; end if;
  if (select count(*) from public.messages m where m.sender = who and m.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited';
  end if;
  insert into public.messages (name, email, topic, message, lang, page, sender)
  values (trim(p_name), trim(p_email), left(coalesce(p_topic, ''), 60), trim(p_message),
          case when p_lang in ('en', 'pl') then p_lang end, left(coalesce(p_page, ''), 40), who);
end;
$$;
revoke all on function public.submit_message(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_message(text, text, text, text, text, text, text) to anon, authenticated;

-- ---------- public content: one request for the whole site ----------

create or replace function public.site_content()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'texts', coalesce((
      select jsonb_object_agg(t.key, jsonb_build_object('pl', t.pl, 'en', t.en))
      from public.texts t
    ), '{}'::jsonb),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'c', p.collection, 's', p.section, 'src', p.src, 'full', p.full_src, 'w', p.w, 'h', p.h
      ) order by p.collection, p.section, p.sort, p.created_at)
      from public.photos p
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.site_content() from public;
grant execute on function public.site_content() to anon, authenticated;

-- ---------- admin: analytics overview ----------

create or replace function public.stats_overview(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  d int := greatest(1, least(coalesce(p_days, 30), 365));
  since date := current_date - (d - 1);
begin
  if public.is_admin() is not true then raise exception 'not_allowed'; end if;
  return jsonb_build_object(
    'days', d,
    'today', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor)) from public.page_views where day = current_date),
    'window', (select jsonb_build_object('views', count(*), 'visitors', count(distinct (day, visitor))) from public.page_views where day >= since),
    'all', (select jsonb_build_object('views', count(*), 'visitors', count(distinct (day, visitor))) from public.page_views),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', g.day, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0)) order by g.day)
      from (select generate_series(since, current_date, interval '1 day')::date as day) g
      left join (select day, count(*) views, count(distinct visitor) visitors from public.page_views where day >= since group by day) v using (day)
    ), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(x) from (select page, count(*) views, count(distinct (day, visitor)) visitors from public.page_views where day >= since group by page order by 2 desc) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (select coalesce(device, '?') k, count(*) n from public.page_views where day >= since group by 1 order by 2 desc) x), '[]'::jsonb),
    'langs', coalesce((select jsonb_agg(x) from (select coalesce(lang, '?') k, count(*) n from public.page_views where day >= since group by 1 order by 2 desc) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(x) from (select coalesce(country, '?') k, count(*) n from public.page_views where day >= since group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'refs', coalesce((select jsonb_agg(x) from (select ref k, count(*) n from public.page_views where day >= since and ref is not null group by 1 order by 2 desc limit 8) x), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.stats_overview(int) from public, anon;
grant execute on function public.stats_overview(int) to authenticated;

-- ---------- storage: public bucket, admin-only writes ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_admin_select on storage.objects;
create policy media_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin() is true);
drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin() is true);
drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin() is true);
drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin() is true);
