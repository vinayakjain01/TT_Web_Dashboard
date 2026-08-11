import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ supabaseConfigured: isSupabaseConfigured() });
}
