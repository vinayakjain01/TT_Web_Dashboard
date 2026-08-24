-- Leads now spans more than one sheet tab (config/leadTabs.ts adds "TT AUGUST"
-- alongside the original "Tarun Tahiliani" tab) - source_row_index resets to 1 for each
-- tab's own rows (same as store_appointments always has), so it can no longer be unique
-- on its own across the whole `leads` table. This mirrors store_appointments' existing
-- (tab_gid, source_row_index) pattern exactly, retrofitted onto leads for its first
-- multi-tab sync.
--
-- This entire migration has been dry-run end-to-end against a mock copy of the schema
-- (leads/store_appointments/lead_appointment_matches + all four views + the 0004
-- functions, seeded with a matched Store Appointment lead) before being handed over -
-- every comment below citing a specific error is quoting what that dry run actually hit.

alter table leads add column if not exists tab_gid text not null default '';
alter table leads add column if not exists tab_title text not null default '';

-- v_leads_recent/v_real_leads_recent (0002) were defined with `select *` - Postgres
-- expands that to a fixed column list AT CREATE TIME, not dynamically on every query, so
-- the two ALTERs above did NOT add tab_gid/tab_title to either view. Both must be
-- re-created now, before v_unclear_leads below (which selects l.tab_gid FROM
-- v_leads_recent) - otherwise that statement fails with "column l.tab_gid does not
-- exist" partway through this migration.
create or replace view v_leads_recent as
  select * from leads where extract(year from date) in (2025, 2026);

create or replace view v_real_leads_recent as
  select * from v_leads_recent where not is_test_record;

alter table lead_appointment_matches add column if not exists lead_tab_gid text not null default '';

-- Drop lead_appointment_matches' old FK + old 3-column unique constraint FIRST - the FK
-- depends on leads' unique index on source_row_index, so it must go before that index
-- can be dropped below (confirmed by actually running this migration against a mock
-- copy of the schema: dropping leads' constraint first fails with "cannot drop
-- constraint ... because other objects depend on it").
--
-- Constraint names are looked up dynamically (by which columns they actually cover)
-- rather than hardcoded, since Postgres auto-generates them and this migration has never
-- been run against this specific database to confirm the exact names in advance.
-- attname is Postgres's internal `name` type, not `text` - array_agg(attname) produces
-- name[], which has no equality operator against a text[] literal, so both sides are
-- explicitly cast to text[] (confirmed by actually running this against a mock schema -
-- the uncast version fails with "operator does not exist: name[] = text[]").
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'lead_appointment_matches'
      and c.contype = 'f'
      and (select array_agg(a.attname::text order by a.attname::text) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['lead_source_row_index']::text[]
  loop
    execute format('alter table lead_appointment_matches drop constraint %I', con.conname);
  end loop;

  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'lead_appointment_matches'
      and c.contype = 'u'
      and (select array_agg(a.attname::text order by a.attname::text) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['appointment_source_row_index', 'appointment_tab_gid', 'lead_source_row_index']::text[]
  loop
    execute format('alter table lead_appointment_matches drop constraint %I', con.conname);
  end loop;
end $$;

-- Now safe to drop leads' old single-column unique constraint (nothing depends on it
-- anymore) and add the composite one.
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
      and (select array_agg(a.attname::text order by a.attname::text) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
          = array['source_row_index']::text[]
  loop
    execute format('alter table leads drop constraint %I', con.conname);
  end loop;
end $$;

alter table leads add constraint leads_tab_gid_source_row_index_key unique (tab_gid, source_row_index);

alter table lead_appointment_matches
  add constraint lead_appointment_matches_lead_fkey
  foreign key (lead_tab_gid, lead_source_row_index) references leads (tab_gid, source_row_index) on delete cascade;

alter table lead_appointment_matches
  add constraint lead_appointment_matches_unique_pair
  unique (lead_tab_gid, lead_source_row_index, appointment_tab_gid, appointment_source_row_index);

-- Both v_lead_journey and v_unclear_leads below join through lead_appointment_matches
-- into leads - update both joins to the new composite key.
-- v_lead_journey's own output column list is unchanged (still an explicit SELECT list,
-- not `l.*`), so CREATE OR REPLACE is safe here.

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

-- CREATE OR REPLACE VIEW only allows new trailing columns when every existing column
-- stays in the same position - fine for v_leads_recent/v_lead_journey above, but
-- v_unclear_leads' trailing unclear_reason column would get pushed two positions later
-- now that l.* (from the just-widened v_leads_recent) includes tab_gid/tab_title before
-- it, which Postgres rejects ("cannot change name of view column ... to ..."). Drop and
-- recreate instead - nothing else in the schema selects from v_unclear_leads, and every
-- caller reads it by column name (LeadRow/UnclearLeadRow), never by position.
drop view if exists v_unclear_leads;

create view v_unclear_leads as
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
