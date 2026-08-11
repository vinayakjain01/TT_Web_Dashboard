import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedLeads } from "@/lib/dataSource";
import { applyLeadFiltersToQuery, filterLeadRows, parseLeadFilterParams } from "@/lib/filters/leadFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";

export const dynamic = "force-dynamic";

interface ChartableLead {
  country: string;
  source: string;
  is_converted: boolean;
}

function buildCharts(rows: ChartableLead[]) {
  const countryMap = new Map<string, { total: number; converted: number }>();
  for (const r of rows) {
    const key = r.country.trim();
    if (!key) continue; // blank/unknown country omitted - matches the chart's own rule
    const entry = countryMap.get(key) ?? { total: 0, converted: 0 };
    entry.total += 1;
    if (r.is_converted) entry.converted += 1;
    countryMap.set(key, entry);
  }
  const byCountry = Array.from(countryMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, v]) => ({ name, total: v.total, converted: v.converted }));

  const sourceMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.source.trim() || "Unknown";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const bySource = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return { byCountry, bySource };
}

/**
 * Chart data for the Lead Funnel section - same source view and same filters as
 * summary/route.ts and the table route (v_leads_recent, every lead including former
 * "test" placeholder rows). Both charts are computed from one filtered fetch rather
 * than two separate round trips, since they're grouping the same rows.
 */
export async function GET(request: Request) {
  const filters = parseLeadFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<ChartableLead>((from, to) =>
      applyLeadFiltersToQuery(supabase.from("v_leads_recent").select("country, source, is_converted"), filters).range(from, to)
    );
    return NextResponse.json(buildCharts(rows));
  }

  const parsed = await fetchParsedLeads();
  const syncedAt = new Date().toISOString();
  const scoped = parsed.filter((l) => isInLeadReportingScope(l.date)).map((l, i) => leadToRow(l, i + 1, syncedAt));
  const filtered = filterLeadRows(scoped, filters);
  return NextResponse.json(buildCharts(filtered));
}
