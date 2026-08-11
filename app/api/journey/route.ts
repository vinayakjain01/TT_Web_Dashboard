import { NextResponse } from "next/server";
import { fetchParsedDataset } from "@/lib/dataSource";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { matchToJourneyRow } from "@/lib/types/mapping";
import type { LeadJourneyRow } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const journey = await fetchAllRows<LeadJourneyRow>((from, to) =>
      supabase.from("v_lead_journey").select("*").order("lead_source_row_index").range(from, to)
    );
    return NextResponse.json({ journey, source: "supabase" });
  }

  const { leads, appointments, matches } = await fetchParsedDataset();
  const leadByRow = new Map(leads.map((l) => [l.sourceRowIndex, l]));
  const apptByKey = new Map(appointments.map((a) => [`${a.tabGid}:${a.sourceRowIndex}`, a]));
  const journey: LeadJourneyRow[] = matches.map((m) =>
    matchToJourneyRow(m, leadByRow.get(m.leadSourceRowIndex)!, apptByKey.get(`${m.appointmentTabGid}:${m.appointmentSourceRowIndex}`)!)
  );
  return NextResponse.json({ journey, source: "sheets-live" });
}
