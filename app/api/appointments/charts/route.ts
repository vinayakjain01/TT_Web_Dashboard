import { NextResponse } from "next/server";
import { isPurchased } from "@/lib/business/appointmentMetrics";
import { fetchParsedAppointments } from "@/lib/dataSource";
import { applyAppointmentFiltersToQuery, filterAppointmentRows, parseAppointmentFilterParams } from "@/lib/filters/appointmentFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appointmentToRow } from "@/lib/types/mapping";

export const dynamic = "force-dynamic";

interface ChartableAppointment {
  city: string;
  visit_outcome: string;
  order_placed_flag_raw: string;
}

function buildCharts(rows: ChartableAppointment[]) {
  const map = new Map<string, { appointments: number; purchases: number }>();
  for (const a of rows) {
    const key = a.city.trim() || "Unknown";
    const entry = map.get(key) ?? { appointments: 0, purchases: 0 };
    entry.appointments += 1;
    if (isPurchased(a)) entry.purchases += 1;
    map.set(key, entry);
  }
  const byCity = Array.from(map.entries())
    .sort((a, b) => b[1].appointments - a[1].appointments)
    .map(([name, v]) => ({ name, appointments: v.appointments, purchases: v.purchases }));
  return { byCity };
}

/**
 * Chart data for the Store Appointments section - same source and same filters as
 * summary/route.ts and the table route.
 */
export async function GET(request: Request) {
  const filters = parseAppointmentFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<ChartableAppointment>((from, to) =>
      applyAppointmentFiltersToQuery(
        supabase.from("store_appointments").select("city, visit_outcome, order_placed_flag_raw"),
        filters
      ).range(from, to)
    );
    return NextResponse.json(buildCharts(rows));
  }

  const parsed = await fetchParsedAppointments();
  const syncedAt = new Date().toISOString();
  const scoped = parsed.map((a, i) => appointmentToRow(a, i + 1, syncedAt));
  const filtered = filterAppointmentRows(scoped, filters);
  return NextResponse.json(buildCharts(filtered));
}
