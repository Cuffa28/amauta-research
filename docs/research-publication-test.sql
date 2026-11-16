-- Transactional integration checks. All fixtures, publications and logs roll back.
begin;
do $test$
declare d uuid; r jsonb; before_hash text;
begin
 select md5(body) into before_hash from public.research_daily_editions where market_date='2026-11-13';
 r:=research_internal.publish_ready('2026-11-17T11:44:00Z');
 if r->>'outcome'<>'before_deadline' then raise exception 'Published before 08:45';end if;
 r:=research_internal.publish_ready('2026-11-23T11:45:00Z');
 if r->>'outcome'<>'non_business_day' then raise exception 'Holiday not respected';end if;
 r:=research_internal.publish_ready('2026-11-17T11:45:00Z');
 if r->>'outcome'<>'missing_ready_draft' then raise exception 'Missing draft not detected';end if;
 insert into public.research_daily_editions(market_date,status,title,summary,body,coverage,sources,charts,briefing)
 select '2026-11-16','draft',title,summary,body,coverage,sources,charts,briefing from public.research_daily_editions where market_date='2026-11-13' returning id into d;
 insert into public.research_publication_queue(publication_date,edition_id,ready_at,cutoff_at,body_md5,sources_md5,charts_md5,briefing_md5,page_url)
 select '2026-11-17',id,'2026-11-17T11:42Z','2026-11-17T11:40Z',md5(body),md5(sources::text),md5(charts::text),md5(briefing::text),'https://chatgpt.com/space/page_test_fixture' from public.research_daily_editions where id=d;
 update public.research_daily_editions set body=body||' changed' where id=d;
 r:=research_internal.publish_ready('2026-11-17T11:45Z');
 if r->>'outcome'<>'blocked_validation' then raise exception 'Changed draft published';end if;
 update public.research_daily_editions set body=(select body from public.research_daily_editions where market_date='2026-11-13') where id=d;
 r:=research_internal.publish_ready('2026-11-17T11:45Z');
 if r->>'outcome'<>'published' then raise exception 'Ready draft did not publish: %',r;end if;
 r:=research_internal.publish_ready('2026-11-17T11:45:30Z');
 if r->>'outcome'<>'already_published' then raise exception 'Publication not idempotent';end if;
 if (select md5(body) from public.research_daily_editions where market_date='2026-11-13')<>before_hash then raise exception 'Previous report changed';end if;
 if not exists(select 1 from public.research_daily_revisions where edition_id=d) then raise exception 'Original draft not preserved';end if;
end $test$;
rollback;

