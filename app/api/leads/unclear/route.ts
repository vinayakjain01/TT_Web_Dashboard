import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedDataset } from "@/lib/dataSource";
import { applyLeadFiltersToQuery, filterLeadRows, parseLeadFilterParams } from "@/lib/filters/leadFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";
import type { LeadRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

/**
 * "Unclear Leads": status = 'Store Appointment' leads that the loose phone/name join
 * (lib/business/match.ts) never matched to a Store Appointments record. Reuses that
 * same matching output rather than re-implementing matching here - v_unclear_leads on
 * the Supabase path reads lead_appointment_matches (populated by scripts/sync.ts, the
 * same table v_lead_journey joins against), and the fallback path reuses the exact
 * `matches` array fetchParsedDataset() already computes with matchLeadsToAppointments.
 * Applies the same shared lead-funnel filters as every other route in this section, so
 * this view can never drift out of sync with the KPI cards, charts, or table.
 */
export async function GET(request: Request) {
  const filters = parseLeadFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const leads = await fetchAllRows<LeadRow>((from, to) =>
      applyLeadFiltersToQuery(supabase.from("v_unclear_leads").select("*"), filters)
        .order("source_row_index")
        .range(from, to)
    );
    return NextResponse.json({ leads, source: "supabase" });
  }

  const { leads: parsedLeads, matches } = await fetchParsedDataset();
  const matchedLeadRows = new Set(matches.map((m) => m.leadSourceRowIndex));
  const syncedAt = new Date().toISOString();
  const scoped = parsedLeads
    .filter(
      (l) => isInLeadReportingScope(l.date) && l.status === "Store Appointment" && !matchedLeadRows.has(l.sourceRowIndex)
    )
    .map((l, i) => leadToRow(l, i + 1, syncedAt));
  const leads = filterLeadRows(scoped, filters);
  return NextResponse.json({ leads, source: "sheets-live" });
}
