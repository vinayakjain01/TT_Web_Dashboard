import { NextResponse } from "next/server";
import { isInLeadReportingScope } from "@/lib/business/reportingScope";
import { fetchParsedLeads } from "@/lib/dataSource";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { leadToRow } from "@/lib/types/mapping";
import type { LeadRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    // v_leads_recent is the 2025-2026 reporting scope (rule: apply the year filter at
    // the view layer, not by touching how leads is ingested) - keeps test records,
    // same as the raw table, since the detail table still shows them per rule 1.
    const leads = await fetchAllRows<LeadRow>((from, to) =>
      supabase.from("v_leads_recent").select("*").order("source_row_index").range(from, to)
    );
    return NextResponse.json({ leads, source: "supabase" });
  }

  // No Supabase project connected yet - read live from the sheet instead of failing,
  // applying the same 2025-2026 scope the real v_leads_recent view would.
  const parsed = await fetchParsedLeads();
  const syncedAt = new Date().toISOString();
  const leads = parsed.filter((l) => isInLeadReportingScope(l.date)).map((l, i) => leadToRow(l, i + 1, syncedAt));
  return NextResponse.json({ leads, source: "sheets-live" });
}
