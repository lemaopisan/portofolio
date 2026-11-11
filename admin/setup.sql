-- Run once in your Supabase project's SQL Editor. No passwords or keys go here.
create table if not exists public.portfolio_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.portfolio_admins enable row level security;
revoke all on public.portfolio_admins from anon, authenticated;

create or replace function public.is_portfolio_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.portfolio_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

create table if not exists public.portfolio_content (
 id text primary key check(id='main'), payload jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
alter table public.portfolio_content enable row level security;
revoke all on public.portfolio_content from anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
drop policy if exists "Public portfolio content" on public.portfolio_content;
create policy "Public portfolio content" on public.portfolio_content for select using(id='main');

create or replace function public.save_portfolio(new_payload jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare saved_revision integer;
begin
 if not public.is_portfolio_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if new_payload->>'version' is distinct from '1' or jsonb_typeof(new_payload->'profile') is distinct from 'object'
 or jsonb_typeof(new_payload->'projects') is distinct from 'array'
 or jsonb_typeof(new_payload->'experience') is distinct from 'array'
 or jsonb_typeof(new_payload->'toolkit') is distinct from 'array'
 or jsonb_typeof(new_payload->'education') is distinct from 'array'
 or octet_length(new_payload::text)>500000 then raise exception 'Invalid portfolio document'; end if;
 insert into public.portfolio_content(id,payload,revision) values('main',new_payload,1)
 on conflict(id) do update set payload=excluded.payload,revision=portfolio_content.revision+1,updated_at=now()
 where portfolio_content.revision=expected_revision
 returning revision into saved_revision;
 if saved_revision is null then raise exception 'Content changed in another session. Reload before publishing.' using errcode='40001'; end if;
 return saved_revision;
end; $$;
revoke all on function public.save_portfolio(jsonb,integer) from public;
grant execute on function public.save_portfolio(jsonb,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-assets','portfolio-assets',true,5242880,array['application/pdf'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['application/pdf'];
drop policy if exists "Admin CV upload" on storage.objects;
create policy "Admin CV upload" on storage.objects for insert to authenticated
with check(bucket_id='portfolio-assets' and name like 'cv/%' and public.is_portfolio_admin());
drop policy if exists "Admin CV read" on storage.objects;
create policy "Admin CV read" on storage.objects for select to authenticated
using(bucket_id='portfolio-assets' and public.is_portfolio_admin());
drop policy if exists "Admin CV replace" on storage.objects;
create policy "Admin CV replace" on storage.objects for update to authenticated
using(bucket_id='portfolio-assets' and public.is_portfolio_admin())
with check(bucket_id='portfolio-assets' and name like 'cv/%' and public.is_portfolio_admin());

create table if not exists public.portfolio_events(
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(), session_id uuid not null,
 event_name text not null check(event_name in('page_view','cv_click','project_open','project_link')),
 target text not null default '' check(length(target)<=200)
);
create index if not exists portfolio_events_session_time on public.portfolio_events(session_id,created_at);
create index if not exists portfolio_events_time on public.portfolio_events(created_at);
alter table public.portfolio_events enable row level security;
revoke all on public.portfolio_events from anon, authenticated;

create or replace function public.track_portfolio_event(event_name text, event_target text, visit_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if public.is_portfolio_admin() then return; end if;
 if visit_id is null or event_name not in('page_view','cv_click','project_open','project_link')
 or event_name is null or length(coalesce(event_target,''))>200 then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(visit_id::text,0));
 if (select count(*) from public.portfolio_events e where e.session_id=visit_id and e.created_at>now()-interval '1 day')>=200 then return; end if;
 if exists(select 1 from public.portfolio_events e where e.session_id=visit_id and e.event_name=track_portfolio_event.event_name and e.target=coalesce(event_target,'') and e.created_at>now()-interval '3 seconds') then return; end if;
 insert into public.portfolio_events(session_id,event_name,target) values(visit_id,event_name,coalesce(event_target,''));
end; $$;
revoke all on function public.track_portfolio_event(text,text,uuid) from public;
grant execute on function public.track_portfolio_event(text,text,uuid) to anon, authenticated;

create or replace function public.portfolio_analytics(since_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_portfolio_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object(
 'pageViews',count(*) filter(where event_name='page_view'),
 'sessions',count(distinct session_id) filter(where event_name='page_view'),
 'cvClicks',count(*) filter(where event_name='cv_click'),
 'projectOpens',count(*) filter(where event_name='project_open'),
 'daily',coalesce((select jsonb_agg(row_to_json(d)) from(select to_char(created_at at time zone 'UTC','YYYY-MM-DD') as day,count(*) filter(where event_name='page_view') as views,count(*) filter(where event_name='cv_click') as cv_clicks from public.portfolio_events where created_at>=since_at group by 1 order by 1)d),'[]'::jsonb),
 'projects',coalesce((select jsonb_agg(row_to_json(p)) from(select target,count(*) filter(where event_name='project_open') as opens,count(*) filter(where event_name='project_link') as link_clicks from public.portfolio_events where created_at>=since_at and event_name in('project_open','project_link') group by target order by opens desc)p),'[]'::jsonb)
 ) into result from public.portfolio_events where created_at>=since_at;
 return result;
end; $$;
revoke all on function public.portfolio_analytics(timestamptz) from public;
grant execute on function public.portfolio_analytics(timestamptz) to authenticated;

-- After adding your admin user under Authentication > Users, run this separately:
-- insert into public.portfolio_admins(user_id) values ('YOUR-USER-UUID-HERE');
