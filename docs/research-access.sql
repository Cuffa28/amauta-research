-- Read-only published research access. API also validates Auth and active membership.
-- Drafts, internal revisions and write privileges remain unavailable to clients.
alter policy research_team_read on public.research_daily_editions
to authenticated
using (
  status = 'published'
  and published_at <= now()
  and lower(auth.jwt()->>'email') ~ '^[^@[:space:]]+@amautainversiones[.]com$'
  and exists (
    select 1 from public.team_members m
    where lower(m.email) = lower(auth.jwt()->>'email') and m.active = true
  )
);
