import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedLeads } from "@/lib/dataSource";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function distinct(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim()))).sort();
}

/**
 * Distinct Status/Country/Source values for the filter dropdowns - deliberately NEVER
 * filtered by the active selections, so picking a Status doesn't make Country options
 * disappear. This is why it's its own route rather than derived from the table route's
 * (filtered) response.
 */
export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<{ status: string; country: string; source: string }>((from, to) =>
      supabase.from("v_leads_recent").select("status, country, source").range(from, to)
    );
    return NextResponse.json({
      statuses: distinct(rows.map((r) => r.status)),
      countries: distinct(rows.map((r) => r.country)),
      sources: distinct(rows.map((r) => r.source)),
    });
  }

  const parsed = await fetchParsedLeads();
  const scoped = parsed.filter((l) => isInLeadReportingScope(l.date));
  return NextResponse.json({
    statuses: distinct(scoped.map((l) => l.status)),
    countries: distinct(scoped.map((l) => l.country)),
    sources: distinct(scoped.map((l) => l.source)),
  });
}
