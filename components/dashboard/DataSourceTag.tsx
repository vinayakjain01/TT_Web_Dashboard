"use client";

import { useEffect, useState } from "react";

interface Status {
  supabaseConfigured: boolean;
  lastSyncedAt: string | null;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];
const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "just now" - no library, this dashboard's sync cadence (every 6h) never
 * needs finer than minute precision. */
function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (seconds >= unitSeconds) return relativeTimeFormat.format(-Math.floor(seconds / unitSeconds), unit);
  }
  return "just now";
}

export function DataSourceTag() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ supabaseConfigured: false, lastSyncedAt: null }));
  }, []);

  if (status === null) return null;
  const { supabaseConfigured, lastSyncedAt } = status;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}
    >
      <span style={{ color: supabaseConfigured ? "var(--teal)" : "var(--amber)" }}>&#9679;</span>
      {supabaseConfigured ? "Connected to Supabase" : "Preview - reading live from Google Sheets"}
      {supabaseConfigured && lastSyncedAt && <span>&middot; Last synced {timeAgo(lastSyncedAt)}</span>}
    </span>
  );
}
