-- "Unclear Leads": status = 'Store Appointment' leads where the loose phone/name join
-- (lib/business/match.ts, populated into lead_appointment_matches by scripts/sync.ts on
-- every sync - not re-implemented here) found no corresponding Store Appointments
-- record. Deliberately narrow to this one status: most leads never reach appointment
-- stage and were never expected to match, so surfacing every unmatched lead would dilute
-- the specific operational gap this view exists to catch (appointment claimed, nothing
-- to confirm it - not logged, marked prematurely, or a name/phone mismatch).
--
-- Scoped through v_leads_recent (2025-2026), same as every other lead funnel view.
create or replace view v_unclear_leads as
  select l.*
  from v_leads_recent l
  where l.status = 'Store Appointment'
    and not exists (
      select 1 from lead_appointment_matches m where m.lead_source_row_index = l.source_row_index
    );
