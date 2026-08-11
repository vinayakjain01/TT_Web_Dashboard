import { NextResponse } from "next/server";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StoreAppointmentRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const appointments = await fetchAllRows<StoreAppointmentRow>((from, to) =>
    supabase.from("store_appointments").select("*").order("tab_gid").order("source_row_index").range(from, to)
  );
  return NextResponse.json({ appointments });
}
