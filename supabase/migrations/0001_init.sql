-- TT_Web_Dashboard schema: lead funnel + store appointments + soft cross-link.
--
-- The sync job (scripts/sync.ts) truncates and re-inserts both leads and
-- store_appointments on every run rather than upserting by a fragile row-position key -
-- neither sheet has a natural stable ID, and a full reload is simplest to keep correct
-- when rows are edited or removed upstream. source_row_index is unique per run but is
-- NOT a durable identifier across time - don't build anything outside this schema that
-- assumes it survives a sheet edit.

create table if not exists leads (
  id bigserial primary key,
  source_row_index integer not null unique,
  date date,
  date_raw text not null default '',
  customer_name text not null default '',
  source text not null default '',
  country text not null default '',
  phone_raw text not null default '',
  phone_key text,
  follow_up_date date,
  follow_up_date_raw text not null default '',
  status text not null default '',
  is_converted boolean not null default false,
  is_store_appointment boolean not null default false,
  potential_order_amount numeric,
  sale_amount numeric,
  payment_mode text not null default '',
  lead_added_by text not null default '',
  lead_converted_by text not null default '',
  notes_reason_for_refusal text not null default '',
  brand text not null default '',
  sales_target text not null default '',
  city text not null default '',
  product_category text not null default '',
  is_test_record boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_country on leads (country);
create index if not exists idx_leads_source on leads (source);
create index if not exists idx_leads_phone_key on leads (phone_key);
create index if not exists idx_leads_is_test_record on leads (is_test_record);

create table if not exists store_appointments (
  id bigserial primary key,
  tab_gid text not null,
  tab_title text not null,
  source_row_index integer not null,
  sl_no_raw text not null default '',
  name text not null default '',
  date_of_booking date,
  date_of_booking_raw text not null default '',
  date_of_visit date,
  date_of_visit_raw text not null default '',
  date_needs_review boolean not null default false,
  date_review_reason text,
  store_location_raw text not null default '',
  city text not null default '',
  location_needs_review boolean not null default false,
  contact_raw text not null default '',
  primary_phone_raw text,
  primary_phone_key text,
  secondary_phone_raw text,
  secondary_phone_key text,
  follow_up_outcome_raw text not null default '',
  visit_outcome text not null default 'Other / Uncategorized',
  visited_flag_raw text not null default '',
  order_placed_flag_raw text not null default '',
  notes text not null default '',
  product_detail text not null default '',
  price_details text not null default '',
  style_details text not null default '',
  client_reviews text not null default '',
  synced_at timestamptz not null default now(),
  unique (tab_gid, source_row_index)
);

create index if not exists idx_appt_city on store_appointments (city);
create index if not exists idx_appt_visit_outcome on store_appointments (visit_outcome);
create index if not exists idx_appt_date_needs_review on store_appointments (date_needs_review);
create index if not exists idx_appt_location_needs_review on store_appointments (location_needs_review);
create index if not exists idx_appt_primary_phone_key on store_appointments (primary_phone_key);
create index if not exists idx_appt_secondary_phone_key on store_appointments (secondary_phone_key);

create table if not exists lead_appointment_matches (
  id bigserial primary key,
  lead_source_row_index integer not null references leads (source_row_index) on delete cascade,
  appointment_tab_gid text not null,
  appointment_source_row_index integer not null,
  match_basis text not null check (match_basis in ('phone', 'name')),
  synced_at timestamptz not null default now(),
  unique (lead_source_row_index, appointment_tab_gid, appointment_source_row_index),
  foreign key (appointment_tab_gid, appointment_source_row_index)
    references store_appointments (tab_gid, source_row_index) on delete cascade
);

-- Rule 1: every KPI/conversion/chart view reads from here, never from `leads` directly.
create or replace view v_real_leads as
  select * from leads where not is_test_record;

-- Rule 2's escape hatch, surfaced for a human, not guessed away.
create or replace view v_date_needs_review as
  select * from store_appointments where date_needs_review order by tab_gid, source_row_index;

-- Rule 4's escape hatch.
create or replace view v_location_needs_review as
  select * from store_appointments where location_needs_review order by tab_gid, source_row_index;

-- Rule 6: the one additional view the soft join powers - lead -> appointment -> outcome.
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
  join leads l on l.source_row_index = m.lead_source_row_index
  join store_appointments a
    on a.tab_gid = m.appointment_tab_gid and a.source_row_index = m.appointment_source_row_index;
