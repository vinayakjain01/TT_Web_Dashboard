-- Leads now spans more than one sheet tab (config/leadTabs.ts adds "TT AUGUST"
-- alongside the original "Tarun Tahiliani" tab) - source_row_index resets to 1 for each
-- tab's own rows (same as store_appointments always has), so it can no longer be unique
-- on its own across the whole `leads` table. This mirrors store_appointments' existing
-- (tab_gid, source_row_index) pattern exactly, retrofitted onto leads for its first
-- multi-tab sync.
--
-- Constraint names are looked up dynamically (by which columns they actually cover)
-- rather than hardcoded, since Postgres auto-generates them and this migration has never
-- been run against this specific database to confirm the exact names in advance.

alter table leads add column if not exists tab_gid text not null default '';
alter table leads add column if not exists tab_title text not null default '';

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'leads'
      and c.contype = 'u'
      and (select array_agg(a.attname order by a.attname) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['source_row_index']
  loop
    execute format('alter table leads drop constraint %I', con.conname);
  end loop;
end $$;

alter table leads add constraint leads_tab_gid_source_row_index_key unique (tab_gid, source_row_index);

alter table lead_appointment_matches add column if not exists lead_tab_gid text not null default '';

do $$
declare
  con record;
begin
  -- Drop the old single-column FK from lead_appointment_matches.lead_source_row_index
  -- into leads.source_row_index.
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'lead_appointment_matches'
      and c.contype = 'f'
      and (select array_agg(a.attname order by a.attname) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['lead_source_row_index']
  loop
    execute format('alter table lead_appointment_matches drop constraint %I', con.conname);
  end loop;

  -- Drop the old 3-column unique constraint so it can be recreated with lead_tab_gid
  -- included - a duplicate match row should still be impossible per-tab-pair, but the
  -- lead side of that pair now needs its tab in the key too.
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'lead_appointment_matches'
      and c.contype = 'u'
      and (select array_agg(a.attname order by a.attname) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['appointment_source_row_index', 'appointment_tab_gid', 'lead_source_row_index']
  loop
    execute format('alter table lead_appointment_matches drop constraint %I', con.conname);
  end loop;
end $$;

alter table lead_appointment_matches
  add constraint lead_appointment_matches_lead_fkey
  foreign key (lead_tab_gid, lead_source_row_index) references leads (tab_gid, source_row_index) on delete cascade;

alter table lead_appointment_matches
  add constraint lead_appointment_matches_unique_pair
  unique (lead_tab_gid, lead_source_row_index, appointment_tab_gid, appointment_source_row_index);

-- Both views below join through lead_appointment_matches into leads - update both joins
-- to the new composite key. Neither view's own output column list changes, so
-- CREATE OR REPLACE is safe.

create or replace view v_lead_journey as
  select
    l.source_row_index as lead_source_row_index,
    l.customer_name,
    l.source as lead_source,
    l.date as lead_date,
    l.status as lead_status,
    l.country,
    m.match_basis,
    a.tab_gid as appointment_tab_gid,
    a.tab_title as appointment_tab_title,
    a.date_of_booking,
    a.date_of_visit,
    a.city as appointment_city,
    a.visit_outcome
  from lead_appointment_matches m
  join leads l on l.tab_gid = m.lead_tab_gid and l.source_row_index = m.lead_source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index;

create or replace view v_unclear_leads as
  select l.*, 'Visited but not purchased' as unclear_reason
  from v_leads_recent l
  join lead_appointment_matches m on m.lead_tab_gid = l.tab_gid and m.lead_source_row_index = l.source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index
  where l.status = 'Store Appointment'
    and appointment_is_visited(a.visit_outcome, a.visited_flag_raw)
    and not appointment_is_purchased(a.visit_outcome, a.order_placed_flag_raw)

  union all

  select l.*, 'Booked store appointment but not visited or not purchased' as unclear_reason
  from v_leads_recent l
  join lead_appointment_matches m on m.lead_tab_gid = l.tab_gid and m.lead_source_row_index = l.source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index
  where l.status = 'Store Appointment'
    and not appointment_is_visited(a.visit_outcome, a.visited_flag_raw)
    and not appointment_is_purchased(a.visit_outcome, a.order_placed_flag_raw);
