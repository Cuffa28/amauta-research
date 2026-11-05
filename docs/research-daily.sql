-- Propuesta de esquema. Aplicar solo tras verificar el proyecto de Auth del portal.
-- No contiene informes privados ni datos extraídos de Gmail.
create table public.research_daily_editions (
  id uuid primary key default gen_random_uuid(),
  market_date date not null unique,
  status text not null default 'draft' check (status in ('draft','published')),
  title text not null,
  summary text not null,
  body text not null,
  coverage text not null check (coverage in ('complete','partial')),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'published' or (published_at is not null and length(body) > 0 and jsonb_array_length(sources) > 0))
);
alter table public.research_daily_editions enable row level security;
revoke all on public.research_daily_editions from anon, authenticated;
grant select on public.research_daily_editions to authenticated;
create policy research_team_read on public.research_daily_editions for select to authenticated
using (status = 'published' and published_at <= now() and exists (
  select 1 from public.team_members m
  where lower(m.email) = lower(auth.jwt() ->> 'email') and m.active = true
));
-- Escritura exclusivamente mediante el publicador del servidor. Sin políticas de escritura del navegador.
