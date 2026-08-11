import { createClient } from "@supabase/supabase-js";

/**
 * Server-side only client (secret key). Never import this from a client component -
 * every read the dashboard needs goes through an app/api/* route handler that uses
 * this client, per the architecture note in the brief.
 */
export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY are not set.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
