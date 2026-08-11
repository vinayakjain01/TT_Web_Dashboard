import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeadJourneyRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const journey = await fetchAllRows<LeadJourneyRow>((from, to) =>
    supabase.from("v_lead_journey").select("*").order("lead_source_row_index").range(from, to)
  );
  return NextResponse.json({ journey });
}
