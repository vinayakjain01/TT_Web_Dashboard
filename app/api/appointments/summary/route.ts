import { NextResponse } from "next/server";
import { isPurchased, isVisited } from "@/lib/business/appointmentMetrics";
import { fetchParsedAppointments } from "@/lib/dataSource";
import { applyAppointmentFiltersToQuery, filterAppointmentRows, parseAppointmentFilterParams } from "@/lib/filters/appointmentFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appointmentToRow } from "@/lib/types/mapping";

export const dynamic = "force-dynamic";

interface SummarizableAppointment {
  visit_outcome: string;
  visited_flag_raw: string;
  order_placed_flag_raw: string;
}

function summarize(rows: SummarizableAppointment[]) {
  const total = rows.length;
  const purchased = rows.filter(isPurchased).length;
  const visited = rows.filter(isVisited).length;
  return { total, purchased, visitRate: total ? Number(((visited / total) * 100).toFixed(1)) : 0 };
}

/**
 * KPI cards for the Store Appointments section - same filters as the table and charts
 * routes, applied server-side, so a slicer change moves every visual at once.
 */
export async function GET(request: Request) {
  const filters = parseAppointmentFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<SummarizableAppointment>((from, to) =>
      applyAppointmentFiltersToQuery(
        supabase.from("store_appointments").select("visit_outcome, visited_flag_raw, order_placed_flag_raw"),
        filters
      ).range(from, to)
    );
    return NextResponse.json(summarize(rows));
  }

  const parsed = await fetchParsedAppointments();
  const syncedAt = new Date().toISOString();
  const scoped = parsed.map((a, i) => appointmentToRow(a, i + 1, syncedAt));
  const filtered = filterAppointmentRows(scoped, filters);
  return NextResponse.json(summarize(filtered));
}
