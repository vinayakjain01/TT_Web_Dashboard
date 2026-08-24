import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * "Last synced" is scripts/sync.ts's most recent write timestamp - every row it inserts
 * carries the same synced_at (see leadToRow/appointmentToRow), so the newest one across
 * the whole table is exactly when the last GitHub Actions sync run completed. Only
 * meaningful on the Supabase path - the no-Supabase fallback reads live on every
 * request, so there's no discrete "sync" for it to report.
 */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  if (!supabaseConfigured) {
    return NextResponse.json({ supabaseConfigured, lastSyncedAt: null });
  }

  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("leads").select("synced_at").order("synced_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ supabaseConfigured, lastSyncedAt: data?.synced_at ?? null });
}
