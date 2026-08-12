-- Redefines "Unclear Leads" (0003_unclear_leads.sql) from "no match at all" to two
-- narrower, labeled cases - both REQUIRE a genuine match. A status = 'Store Appointment'
-- lead with no match at all is a different case and is intentionally not included here
-- anymore - it stays visible as normal in the main lead detail table, uncalled-out.
--
-- Case A "Visited but not purchased": the matched appointment shows a visit happened,
--   no purchase resulted.
-- Case B "Booked store appointment but not visited or not purchased": the matched
--   appointment shows no confirmed visit, no purchase resulted.
--
-- appointment_is_visited/appointment_is_purchased mirror
-- lib/business/appointmentMetrics.ts's isVisited/isPurchased exactly (visit_outcome is
-- the authoritative parsed signal; a case-insensitive "starts with y" check on the raw
-- flag columns is the fallback for rows visit_outcome didn't resolve) - kept as named
-- functions, not inlined twice, so the two branches below can't drift apart from each
-- other or from the TS version.
create or replace function is_yes_flag(flag text) returns boolean as $$
  select flag is not null and trim(flag) ~* '^y';
$$ language sql immutable;

create or replace function appointment_is_visited(visit_outcome text, visited_flag_raw text) returns boolean as $$
  select visit_outcome = 'Purchased' or visit_outcome = 'Visited, No Purchase' or is_yes_flag(visited_flag_raw);
$$ language sql immutable;

create or replace function appointment_is_purchased(visit_outcome text, order_placed_flag_raw text) returns boolean as $$
  select visit_outcome = 'Purchased' or is_yes_flag(order_placed_flag_raw);
$$ language sql immutable;

create or replace view v_unclear_leads as
  select l.*, 'Visited but not purchased' as unclear_reason
  from v_leads_recent l
  join lead_appointment_matches m on m.lead_source_row_index = l.source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index
  where l.status = 'Store Appointment'
    and appointment_is_visited(a.visit_outcome, a.visited_flag_raw)
    and not appointment_is_purchased(a.visit_outcome, a.order_placed_flag_raw)

  union all

  select l.*, 'Booked store appointment but not visited or not purchased' as unclear_reason
  from v_leads_recent l
  join lead_appointment_matches m on m.lead_source_row_index = l.source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index
  where l.status = 'Store Appointment'
    and not appointment_is_visited(a.visit_outcome, a.visited_flag_raw)
    and not appointment_is_purchased(a.visit_outcome, a.order_placed_flag_raw);
