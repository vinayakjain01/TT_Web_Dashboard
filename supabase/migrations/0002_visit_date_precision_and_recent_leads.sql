-- Two independent additions:
--
-- 1. Date-range and vague-date parsing (see lib/business/dates.ts) can now resolve a
--    date_of_visit from input that isn't a single precise date - a range keeps its
--    full original text here rather than losing it, and a vague "month + week" value
--    is marked so it never displays identically to a confirmed date.
alter table store_appointments add column if not exists visit_date_note text;
alter table store_appointments add column if not exists visit_date_precision text not null default 'exact';

-- 2. Lead funnel reporting is scoped to 2025-2026 - applied at this view layer, not by
-- touching how leads is ingested, so every year keeps being cleaned and stored, and the
-- scope here can change later without re-running the sync. v_leads_recent keeps test
-- records (the detail table still shows them per rule 1); v_real_leads_recent excludes
-- them on top of that, for every KPI card and chart.
create or replace view v_leads_recent as
  select * from leads where extract(year from date) in (2025, 2026);

create or replace view v_real_leads_recent as
  select * from v_leads_recent where not is_test_record;
