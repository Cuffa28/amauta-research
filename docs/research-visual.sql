-- Applied through Supabase migration research_visual_briefing on 2026-11-12.
-- Uses the table's existing personal SELECT policy. No grants or RLS changes.
alter table public.research_daily_editions add column if not exists briefing jsonb default null;
alter table public.research_daily_editions add constraint research_briefing_object
check (briefing is null or (jsonb_typeof(briefing) = 'object' and briefing->>'version' = '1'));
comment on column public.research_daily_editions.briefing is
'Private editorial visual brief v1: cutoff, intro, metrics, yesterday, today. Figures must be sourced; archive published row before changes. Existing RLS applies.';
