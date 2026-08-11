import { NextResponse } from "next/server";
import { fetchParsedAppointments } from "@/lib/dataSource";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appointmentToRow } from "@/lib/types/mapping";
import type { StoreAppointmentRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const appointments = await fetchAllRows<StoreAppointmentRow>((from, to) =>
      supabase.from("store_appointments").select("*").order("tab_gid").order("source_row_index").range(from, to)
    );
    return NextResponse.json({ appointments, source: "supabase" });
  }

  const parsed = await fetchParsedAppointments();
  const syncedAt = new Date().toISOString();
  const appointments = parsed.map((a, i) => appointmentToRow(a, i + 1, syncedAt));
  return NextResponse.json({ appointments, source: "sheets-live" });
}
