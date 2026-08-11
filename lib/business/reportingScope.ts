// Mirrors supabase/migrations/0002_visit_date_precision_and_recent_leads.sql's
// v_leads_recent view (EXTRACT(YEAR FROM date) IN (2025, 2026)) - kept here so the
// no-Supabase-configured fallback path applies the exact same lead-funnel year scope
// as the real reporting view, rather than showing every year while Supabase shows only
// 2025-2026.
export const LEAD_REPORTING_YEARS = [2025, 2026];

export function isInLeadReportingScope(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const year = Number(dateIso.slice(0, 4));
  return LEAD_REPORTING_YEARS.includes(year);
}
