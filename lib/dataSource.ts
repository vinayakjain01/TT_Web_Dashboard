import { LEAD_TABS } from "@/config/leadTabs";
import { OUTCOME_SOURCE_COLUMNS, SHEET2_TABS } from "@/config/sheet2Tabs";
import { parseAppointmentRow } from "@/lib/business/appointmentParser";
import { outcomeColumnsResolve } from "@/lib/business/columns";
import { parseLeadRow } from "@/lib/business/leadParser";
import { matchLeadsToAppointments } from "@/lib/business/match";
import type { LeadAppointmentMatch } from "@/lib/business/match";
import type { ParsedLead, ParsedStoreAppointment } from "@/lib/business/types";
import { fetchSheetTabCsv } from "@/lib/sheets/fetchSheet";

const LEAD_SPREADSHEET_ID = "1NvXaOurTqKPYpndiIhCfszfB8V_U0iRhhVVa5aBhXgQ";
const APPOINTMENT_SPREADSHEET_ID = "1Kb7qHzaRTc8KTwqsb8g3GUFtKNd9rbkXV8FsFBAl2rI";

async function fetchParsedLeadsUncached(): Promise<ParsedLead[]> {
  // Fetched in parallel, not one tab at a time - same reasoning as the appointment tabs
  // below: N tabs sequentially means N times a single tab's latency before anything
  // comes back, and this is on the hot path for every sync run and every no-Supabase
  // dashboard load.
  const perTab = await Promise.all(
    LEAD_TABS.map(async (tabConfig) => {
      const rows = await fetchSheetTabCsv(LEAD_SPREADSHEET_ID, tabConfig.gid);
      const tabLeads: ParsedLead[] = [];
      rows.slice(1).forEach((row, i) => {
        const parsed = parseLeadRow(tabConfig, row, i + 1);
        if (parsed) tabLeads.push(parsed);
      });
      return tabLeads;
    })
  );
  return perTab.flat();
}

async function fetchParsedAppointmentsUncached(): Promise<ParsedStoreAppointment[]> {
  // Fetched in parallel, not one tab at a time - with 20 tabs in scope, a sequential
  // loop here means 20x a single tab's latency before anything comes back.
  const perTab = await Promise.all(
    SHEET2_TABS.map(async (tabConfig) => {
      const rows = await fetchSheetTabCsv(APPOINTMENT_SPREADSHEET_ID, tabConfig.gid);
      if (rows.length === 0) return [];
      const [headerRow, ...dataRows] = rows;
      const outcomeColumns = OUTCOME_SOURCE_COLUMNS[tabConfig.gid];
      if (!outcomeColumns) {
        throw new Error(`No OUTCOME_SOURCE_COLUMNS entry for gid=${tabConfig.gid} (${tabConfig.title}).`);
      }
      // The sheet's own column names have already drifted once mid-project (see the
      // comment in config/sheet2Tabs.ts) - if NONE of the configured columns resolve
      // against this tab's current header, every row in it will silently classify as
      // "Other / Uncategorized" instead of erroring, which is worse than a crash. Warn
      // loudly so it gets caught quickly instead of by comparing dashboard screenshots.
      if (!outcomeColumnsResolve(headerRow, outcomeColumns)) {
        console.warn(
          `[dataSource] None of OUTCOME_SOURCE_COLUMNS ${JSON.stringify(outcomeColumns)} for gid=${tabConfig.gid} ` +
            `(${tabConfig.title}) resolve against its current header: ${JSON.stringify(headerRow)}. ` +
            `Every appointment in this tab will classify as "Other / Uncategorized" until config/sheet2Tabs.ts is updated.`
        );
      }
      const tabAppointments: ParsedStoreAppointment[] = [];
      dataRows.forEach((row, i) => {
        const parsed = parseAppointmentRow(tabConfig, outcomeColumns, headerRow, row, i + 1);
        if (parsed) tabAppointments.push(parsed);
      });
      return tabAppointments;
    })
  );
  return perTab.flat();
}

// The dashboard's no-Supabase-configured fallback now calls these from three separate
// API routes per section (table/summary/charts), each applying its own filters - each
// route still filters independently and correctly, but without this, a single page
// load (or one filter change) would trigger 3 fully redundant fetch-and-parse passes
// over the same 20 live Google Sheets tabs. This coalesces concurrent callers onto one
// in-flight request and reuses its result for a short window, rather than caching
// forever - it's a cache on the expensive "go read Google Sheets" step only; every
// route's own filtering of the result is still computed fresh, every time.
const CACHE_TTL_MS = 20_000;
let leadsCache: { promise: Promise<ParsedLead[]>; expiresAt: number } | null = null;
let appointmentsCache: { promise: Promise<ParsedStoreAppointment[]>; expiresAt: number } | null = null;

/**
 * Fetches and parses the lead funnel sheet directly - the single source of truth for
 * "what does a real lead row look like," used by both scripts/sync.ts (writing to
 * Supabase) and the API routes' no-Supabase-configured fallback (reading live for the
 * dashboard). Never duplicate this loop elsewhere.
 */
export function fetchParsedLeads(): Promise<ParsedLead[]> {
  if (leadsCache && Date.now() < leadsCache.expiresAt) return leadsCache.promise;
  const promise = fetchParsedLeadsUncached();
  leadsCache = { promise, expiresAt: Date.now() + CACHE_TTL_MS };
  promise.catch(() => {
    leadsCache = null; // don't let a failed fetch poison the cache for the next caller
  });
  return promise;
}

/** Same role as fetchParsedLeads, for the 20 in-scope Store Appointments tabs. */
export function fetchParsedAppointments(): Promise<ParsedStoreAppointment[]> {
  if (appointmentsCache && Date.now() < appointmentsCache.expiresAt) return appointmentsCache.promise;
  const promise = fetchParsedAppointmentsUncached();
  appointmentsCache = { promise, expiresAt: Date.now() + CACHE_TTL_MS };
  promise.catch(() => {
    appointmentsCache = null;
  });
  return promise;
}

export interface ParsedDataset {
  leads: ParsedLead[];
  appointments: ParsedStoreAppointment[];
  matches: LeadAppointmentMatch[];
}

export async function fetchParsedDataset(): Promise<ParsedDataset> {
  const [leads, appointments] = await Promise.all([fetchParsedLeads(), fetchParsedAppointments()]);
  const matches = matchLeadsToAppointments(leads, appointments);
  return { leads, appointments, matches };
}
