import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedLeads } from "@/lib/dataSource";
import { applyLeadFiltersToQuery, filterLeadRows, parseLeadFilterParams } from "@/lib/filters/leadFilters";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";
import type { LeadRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const filters = parseLeadFilterParams(new URL(request.url).searchParams);

  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    // v_leads_recent is the 2025-2026 reporting scope (rule: apply the year filter at
    // the view layer, not by touching how leads is ingested) - keeps test records,
    // same as the raw table, since the detail table still shows them per rule 1. The
    // same filters the summary/charts routes apply are applied here too.
    // Ordering by tab_gid too (grouping rows by tab before by row index) would be nicer
    // now that source_row_index resets per lead tab, but that column only exists once
    // migration 0005 has actually been applied - ordering by it unconditionally broke
    // this route in production for anyone who hadn't applied 0005 yet. Reverted to the
    // one column guaranteed to exist since 0001.
    const leads = await fetchAllRows<LeadRow>((from, to) =>
      applyLeadFiltersToQuery(supabase.from("v_leads_recent").select("*"), filters).order("source_row_index").range(from, to)
    );
    return NextResponse.json({ leads, source: "supabase" });
  }

  // No Supabase project connected yet - read live from the sheet instead of failing,
  // applying the same 2025-2026 scope and the same filters as the summary/charts routes.
  const parsed = await fetchParsedLeads();
  const syncedAt = new Date().toISOString();
  const scoped = parsed.filter((l) => isInLeadReportingScope(l.date)).map((l, i) => leadToRow(l, i + 1, syncedAt));
  const leads = filterLeadRows(scoped, filters);
  return NextResponse.json({ leads, source: "sheets-live" });
}
