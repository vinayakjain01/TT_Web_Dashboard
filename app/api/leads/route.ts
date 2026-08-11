import { NextResponse } from "next/server";
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
    const leads = await fetchAllRows<LeadRow>((from, to) =>
      supabase.from("leads").select("*").order("source_row_index").range(from, to)
    );
    return NextResponse.json({ leads, source: "supabase" });
  }

  // No Supabase project connected yet - read live from the sheet instead of failing.
  const parsed = await fetchParsedLeads();
  const syncedAt = new Date().toISOString();
  const leads = parsed.map((l, i) => leadToRow(l, i + 1, syncedAt));
  return NextResponse.json({ leads, source: "sheets-live" });
}
