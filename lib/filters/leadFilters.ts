// Single source of truth for the Lead Funnel section's filter shape. The URL query
// param names here (leadStatus/leadCountry/...) are namespaced with a "lead" prefix
// because the Store Appointments section's filters live in the SAME page URL
// simultaneously (both sections stay mounted for instant tab switching) - without the
// prefix, e.g. a shared "from"/"to" key would collide between the two sections.

export interface LeadFilterParams {
  status: string;
  country: string;
  source: string;
  from: string; // ISO date, inclusive
  to: string; // ISO date, inclusive
}

export const LEAD_FILTER_KEYS = {
  status: "leadStatus",
  country: "leadCountry",
  source: "leadSource",
  from: "leadFrom",
  to: "leadTo",
} as const;

export function parseLeadFilterParams(searchParams: URLSearchParams): LeadFilterParams {
  return {
    status: searchParams.get(LEAD_FILTER_KEYS.status) ?? "",
    country: searchParams.get(LEAD_FILTER_KEYS.country) ?? "",
    source: searchParams.get(LEAD_FILTER_KEYS.source) ?? "",
    from: searchParams.get(LEAD_FILTER_KEYS.from) ?? "",
    to: searchParams.get(LEAD_FILTER_KEYS.to) ?? "",
  };
}

/**
 * Applies the lead filters to a Supabase query via WHERE-equivalent chain methods -
 * used by every lead-related route (table, summary, charts) so none of them can drift
 * out of sync with what the others filter by.
 *
 * Typed as `any` in and out deliberately: supabase-js's PostgrestFilterBuilder is a
 * deeply recursive generic (parameterized by schema/row/result), and constraining a
 * generic function parameter to "has .eq/.gte/.lte" against it triggers TS2589 (type
 * instantiation excessively deep). Every call site immediately chains further
 * (`.order().range()`) and hands the result to fetchAllRows<T>, which is where the
 * real type safety on the returned rows lives - this boundary function only ever
 * narrows a query, so the loss of type-checking here is low-risk.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyLeadFiltersToQuery(query: any, filters: LeadFilterParams): any {
  let q = query;
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.country) q = q.eq("country", filters.country);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.from) q = q.gte("date", filters.from);
  if (filters.to) q = q.lte("date", filters.to);
  return q;
}

/** Same filtering logic, applied in-process for the no-Supabase-configured fallback -
 * the sheets-live path has no SQL WHERE clause to lean on, but the filtering still
 * happens once, server-side, inside the route handler, identically for every route. */
export function filterLeadRows<T extends { status: string; country: string; source: string; date: string | null }>(
  rows: T[],
  filters: LeadFilterParams
): T[] {
  return rows.filter(
    (r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.country || r.country === filters.country) &&
      (!filters.source || r.source === filters.source) &&
      (!filters.from || (r.date ?? "") >= filters.from) &&
      (!filters.to || (r.date ?? "") <= filters.to)
  );
}
