// Single source of truth for the Store Appointments section's filter shape - see
// leadFilters.ts for why the URL query param names are namespaced ("appt" prefix).

export interface AppointmentFilterParams {
  city: string;
  outcome: string;
  from: string; // ISO date, inclusive, matched against date_of_visit
  to: string;
}

export const APPOINTMENT_FILTER_KEYS = {
  city: "apptCity",
  outcome: "apptOutcome",
  from: "apptFrom",
  to: "apptTo",
} as const;

export function parseAppointmentFilterParams(searchParams: URLSearchParams): AppointmentFilterParams {
  return {
    city: searchParams.get(APPOINTMENT_FILTER_KEYS.city) ?? "",
    outcome: searchParams.get(APPOINTMENT_FILTER_KEYS.outcome) ?? "",
    from: searchParams.get(APPOINTMENT_FILTER_KEYS.from) ?? "",
    to: searchParams.get(APPOINTMENT_FILTER_KEYS.to) ?? "",
  };
}

/**
 * Applies the appointment filters to a Supabase query - used by every
 * appointment-related route (table, summary, charts) so none can drift out of sync.
 * Typed as `any` deliberately - see the comment on applyLeadFiltersToQuery for why.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAppointmentFiltersToQuery(query: any, filters: AppointmentFilterParams): any {
  let q = query;
  if (filters.city) q = q.eq("city", filters.city);
  if (filters.outcome) q = q.eq("visit_outcome", filters.outcome);
  if (filters.from) q = q.gte("date_of_visit", filters.from);
  if (filters.to) q = q.lte("date_of_visit", filters.to);
  return q;
}

export function filterAppointmentRows<T extends { city: string; visit_outcome: string; date_of_visit: string | null }>(
  rows: T[],
  filters: AppointmentFilterParams
): T[] {
  return rows.filter(
    (a) =>
      (!filters.city || a.city === filters.city) &&
      (!filters.outcome || a.visit_outcome === filters.outcome) &&
      (!filters.from || (a.date_of_visit ?? "") >= filters.from) &&
      (!filters.to || (a.date_of_visit ?? "") <= filters.to)
  );
}
