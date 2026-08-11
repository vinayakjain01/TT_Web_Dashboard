import { NextResponse } from "next/server";
import { fetchParsedAppointments } from "@/lib/dataSource";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appointmentToRow } from "@/lib/types/mapping";

export const dynamic = "force-dynamic";

function distinct(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim()))).sort();
}

/** Distinct City/Outcome values for the filter dropdowns - never filtered by the
 * active selections, same rationale as /api/leads/options. */
export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const rows = await fetchAllRows<{ city: string; visit_outcome: string }>((from, to) =>
      supabase.from("store_appointments").select("city, visit_outcome").range(from, to)
    );
    return NextResponse.json({
      cities: distinct(rows.map((r) => r.city)),
      outcomes: distinct(rows.map((r) => r.visit_outcome)),
    });
  }

  const parsed = await fetchParsedAppointments();
  const syncedAt = new Date().toISOString();
  const scoped = parsed.map((a, i) => appointmentToRow(a, i + 1, syncedAt));
  return NextResponse.json({
    cities: distinct(scoped.map((a) => a.city)),
    outcomes: distinct(scoped.map((a) => a.visit_outcome)),
  });
}
