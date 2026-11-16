-- Private evidence ledger. Original observations are appended, never rewritten.
create table public.research_observations (
 id bigint generated always as identity primary key,
 evidence_key text not null unique,
 series_key text not null,
 label text not null,
 observed_on date not null,
 value numeric not null,
 unit text not null,
 frequency text not null check (frequency in ('D','M','event')),
 provider text not null,
 evidence_class text not null check (evidence_class in ('official','research','derived')),
 data_status text not null check (data_status in ('observed','forecast','disputed')),
 methodology text not null,
 source_title text not null,
 source_url text not null check (source_url ~ '^https://'),
 document_hash text,
 published_on date,
 received_at timestamptz,
 retrieved_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 edition_id uuid references public.research_daily_editions(id),
 supersedes_id bigint references public.research_observations(id),
 check (supersedes_id is null or supersedes_id <> id)
);
create index research_observations_series_date on public.research_observations(series_key,observed_on desc,retrieved_at desc,id desc);
create index research_observations_edition on public.research_observations(edition_id);
alter table public.research_observations enable row level security;
revoke all on public.research_observations from anon,authenticated;
grant select on public.research_observations to authenticated;
create policy research_observations_team_read on public.research_observations for select to authenticated using (
 lower((select auth.jwt()->>'email')) ~ '^[^@[:space:]]+@amautainversiones[.]com$'
 and exists(select 1 from public.team_members m where lower(m.email)=lower((select auth.jwt()->>'email')) and m.active)
);

-- Verified exchange calendar: no assumption that every weekday is a session.
create table public.research_market_calendar (
 session_date date primary key,
 trading_day boolean not null,
 source_url text not null check (source_url ~ '^https://'),
 verified_at timestamptz not null
);
alter table public.research_market_calendar enable row level security;
revoke all on public.research_market_calendar from anon,authenticated;

-- Only the privileged editorial process can mark an exact draft ready.
create table public.research_publication_queue (
 publication_date date primary key,
 edition_id uuid not null unique references public.research_daily_editions(id),
 ready_at timestamptz not null,
 cutoff_at timestamptz not null,
 body_md5 text not null,
 sources_md5 text not null,
 charts_md5 text not null,
 briefing_md5 text not null,
 page_url text not null check (page_url ~ '^https://chatgpt[.]com/space/page_'),
 state text not null default 'ready' check(state in ('ready','published','blocked')),
 check (cutoff_at<=ready_at)
);
alter table public.research_publication_queue enable row level security;
revoke all on public.research_publication_queue from anon,authenticated;
create table public.research_publication_runs (
 publication_date date primary key,
 checked_at timestamptz not null,
 outcome text not null,
 edition_id uuid references public.research_daily_editions(id),
 detail text not null
);
alter table public.research_publication_runs enable row level security;
revoke all on public.research_publication_runs from anon,authenticated;

create schema if not exists research_internal;
revoke all on schema research_internal from public,anon,authenticated;
create or replace function research_internal.publish_ready(p_now timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 today date := (p_now at time zone 'America/Argentina/Buenos_Aires')::date;
 q public.research_publication_queue%rowtype;
 d public.research_daily_editions%rowtype;
 expected_wheel date;
 result text;
 message text;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('amauta_research_publication'));
 if not exists(select 1 from public.research_market_calendar where session_date=today) then
   result:='calendar_missing';message:='Falta verificar el calendario de la fecha. No se publica.';
 elsif not (select trading_day from public.research_market_calendar where session_date=today) then
   return jsonb_build_object('outcome','non_business_day');
 elsif (p_now at time zone 'America/Argentina/Buenos_Aires')::time < time '08:45' then
   return jsonb_build_object('outcome','before_deadline');
 else
   select * into d from public.research_daily_editions where status='published' and (published_at at time zone 'America/Argentina/Buenos_Aires')::date=today order by published_at desc limit 1;
   if found then
     result:='already_published';message:='Se conserva la edición publicada; no se genera una segunda edición.';
   else
     select * into q from public.research_publication_queue where publication_date=today for update;
     if not found then
       result:='missing_ready_draft';message:='El proceso editorial aún no dejó un borrador verificado listo.';
     else
       select * into d from public.research_daily_editions where id=q.edition_id for update;
       select max(session_date) into expected_wheel from public.research_market_calendar where session_date<today and trading_day;
       if d.status is distinct from 'draft' or q.state<>'ready' or q.ready_at>p_now or q.cutoff_at>p_now
         or expected_wheel is null or d.market_date<>expected_wheel
         or pg_catalog.md5(d.body) is distinct from q.body_md5 or pg_catalog.md5(d.sources::text) is distinct from q.sources_md5
         or pg_catalog.md5(d.charts::text) is distinct from q.charts_md5 or pg_catalog.md5(d.briefing::text) is distinct from q.briefing_md5
         or d.briefing is null or jsonb_array_length(d.sources)=0 or jsonb_array_length(d.charts)<2
         or length(d.body)=0 then
         result:='blocked_validation';message:='El borrador no coincide con la revisión editorial, sus gráficos o la última rueda verificada.';
       else
         insert into public.research_daily_revisions(edition_id,reason,snapshot) values(d.id,'Borrador verificado previo a publicación programada',to_jsonb(d));
         update public.research_daily_editions set status='published',published_at=p_now where id=d.id and status='draft';
         update public.research_publication_queue set state='published' where publication_date=today;
         result:='published';message:='Edición verificada publicada. Los antecedentes se conservan como respaldo interno.';
       end if;
     end if;
   end if;
 end if;
 insert into public.research_publication_runs(publication_date,checked_at,outcome,edition_id,detail)
 values(today,p_now,result,d.id,message)
 on conflict(publication_date) do update set checked_at=excluded.checked_at,outcome=excluded.outcome,edition_id=excluded.edition_id,detail=excluded.detail;
 return jsonb_build_object('outcome',result,'edition_id',d.id,'detail',message);
end $$;
revoke all on function research_internal.publish_ready(timestamptz) from public,anon,authenticated;
