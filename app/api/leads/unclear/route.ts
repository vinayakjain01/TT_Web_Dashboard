import { NextResponse } from "next/server";
import { isPurchased, isVisited } from "@/lib/business/appointmentMetrics";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedDataset } from "@/lib/dataSource";
import { applyLeadFiltersToQuery, filterLeadRows, parseLeadFilterParams } from "@/lib/filters/leadFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";
import type { UnclearLeadRow, UnclearReason } from "@/lib/types/db";

export const dynamic = "force-dynamic";

/**
 * "Unclear Leads": status = 'Store Appointment' leads with a genuine matching Store
 * Appointments record (via lead_appointment_matches - the same table v_lead_journey
 * reads, not re-matched here) whose outcome shows no purchase. A status = 'Store
 * Appointment' lead with NO match at all is a different case and is intentionally not
 * included here - it stays visible as normal in the main lead table.
 *
 * Two labeled cases, mirroring v_unclear_leads' two UNION ALL branches exactly:
 *   - "Visited but not purchased": isVisited(appt) && !isPurchased(appt)
 *   - "Booked store appointment but not visited or not purchased": !isVisited(appt) && !isPurchased(appt)
 * isVisited/isPurchased (lib/business/appointmentMetrics.ts) are the exact same
 * functions the Store Appointments summary/charts routes use - reused here rather than
 * a second implementation of "was this visited/purchased."
 */
export async function GET(request: Request) {
  const filters = parseLeadFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const leads = await fetchAllRows<UnclearLeadRow>((from, to) =>
      applyLeadFiltersToQuery(supabase.from("v_unclear_leads").select("*"), filters)
        .order("source_row_index")
        .range(from, to)
    );
    return NextResponse.json({ leads, source: "supabase" });
  }

  const { leads: parsedLeads, appointments, matches } = await fetchParsedDataset();
  const leadByRow = new Map(parsedLeads.map((l) => [l.sourceRowIndex, l]));
  const apptByKey = new Map(appointments.map((a) => [`${a.tabGid}:${a.sourceRowIndex}`, a]));
  const syncedAt = new Date().toISOString();

  const scoped: UnclearLeadRow[] = [];
  matches.forEach((m, i) => {
    const lead = leadByRow.get(m.leadSourceRowIndex);
    const appt = apptByKey.get(`${m.appointmentTabGid}:${m.appointmentSourceRowIndex}`);
    if (!lead || !appt) return;
    if (lead.status !== "Store Appointment" || !isInLeadReportingScope(lead.date)) return;

    const apptFlags = {
      visit_outcome: appt.visitOutcome,
      visited_flag_raw: appt.visitedFlagRaw,
      order_placed_flag_raw: appt.orderPlacedFlagRaw,
    };
    if (isPurchased(apptFlags)) return;

    const reason: UnclearReason = isVisited(apptFlags)
      ? "Visited but not purchased"
      : "Booked store appointment but not visited or not purchased";
    scoped.push({ ...leadToRow(lead, i + 1, syncedAt), unclear_reason: reason });
  });

  const leads = filterLeadRows(scoped, filters);
  return NextResponse.json({ leads, source: "sheets-live" });
}
