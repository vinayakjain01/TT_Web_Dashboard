import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedLeads } from "@/lib/dataSource";
import { applyLeadFiltersToQuery, filterLeadRows, parseLeadFilterParams } from "@/lib/filters/leadFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";

export const dynamic = "force-dynamic";

interface SummarizableLead {
  is_converted: boolean;
  is_store_appointment: boolean;
}

function summarize(rows: SummarizableLead[]) {
  const total = rows.length;
  const converted = rows.filter((r) => r.is_converted).length;
  const storeAppointments = rows.filter((r) => r.is_store_appointment).length;
  return {
    total,
    converted,
    conversionRate: total ? Number(((converted / total) * 100).toFixed(1)) : 0,
    storeAppointments,
  };
}

/**
 * KPI cards for the Lead Funnel section. Reads from v_real_leads_recent (2025-2026,
 * test records excluded) with the SAME filters the table and charts routes apply -
 * this route existing separately from the table route is exactly the piece that was
 * previously missing, which is why the KPI cards never moved when a slicer changed.
 */
export async function GET(request: Request) {
  const filters = parseLeadFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<SummarizableLead>((from, to) =>
      applyLeadFiltersToQuery(
        supabase.from("v_real_leads_recent").select("is_converted, is_store_appointment"),
        filters
      ).range(from, to)
    );
    return NextResponse.json(summarize(rows));
  }

  const parsed = await fetchParsedLeads();
  const syncedAt = new Date().toISOString();
  const scoped = parsed
    .filter((l) => isInLeadReportingScope(l.date) && !l.isTestRecord)
    .map((l, i) => leadToRow(l, i + 1, syncedAt));
  const filtered = filterLeadRows(scoped, filters);
  return NextResponse.json(summarize(filtered));
}
