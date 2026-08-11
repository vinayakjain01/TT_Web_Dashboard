"use client";

import { useEffect, useState } from "react";

export function DataSourceTag() {
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setSupabaseConfigured(data.supabaseConfigured))
      .catch(() => setSupabaseConfigured(false));
  }, []);

  if (supabaseConfigured === null) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}
    >
      <span style={{ color: supabaseConfigured ? "var(--teal)" : "var(--amber)" }}>&#9679;</span>
      {supabaseConfigured ? "Connected to Supabase" : "Preview - reading live from Google Sheets"}
    </span>
  );
}
