import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const leads = await fetchAllRows<LeadRow>((from, to) =>
    supabase.from("leads").select("*").order("source_row_index").range(from, to)
  );
  return NextResponse.json({ leads });
}
