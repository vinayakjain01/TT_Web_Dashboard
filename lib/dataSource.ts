import { OUTCOME_SOURCE_COLUMNS, SHEET2_TABS } from "@/config/sheet2Tabs";
import { parseAppointmentRow } from "@/lib/business/appointmentParser";
import { parseLeadRow } from "@/lib/business/leadParser";
import { matchLeadsToAppointments } from "@/lib/business/match";
import type { LeadAppointmentMatch } from "@/lib/business/match";
import type { ParsedLead, ParsedStoreAppointment } from "@/lib/business/types";
import { fetchSheetTabCsv } from "@/lib/sheets/fetchSheet";

const LEAD_SPREADSHEET_ID = "1NvXaOurTqKPYpndiIhCfszfB8V_U0iRhhVVa5aBhXgQ";
const LEAD_TAB_GID = "1816174605";
const APPOINTMENT_SPREADSHEET_ID = "1Kb7qHzaRTc8KTwqsb8g3GUFtKNd9rbkXV8FsFBAl2rI";

/**
 * Fetches and parses the lead funnel sheet directly - the single source of truth for
 * "what does a real lead row look like," used by both scripts/sync.ts (writing to
 * Supabase) and the API routes' no-Supabase-configured fallback (reading live for the
 * dashboard). Never duplicate this loop elsewhere.
 */
export async function fetchParsedLeads(): Promise<ParsedLead[]> {
  const rows = await fetchSheetTabCsv(LEAD_SPREADSHEET_ID, LEAD_TAB_GID);
  const leads: ParsedLead[] = [];
  rows.slice(1).forEach((row, i) => {
    const parsed = parseLeadRow(row, i + 1);
    if (parsed) leads.push(parsed);
  });
  return leads;
}

/** Same role as fetchParsedLeads, for the 8 in-scope Store Appointments tabs. */
export async function fetchParsedAppointments(): Promise<ParsedStoreAppointment[]> {
  const appointments: ParsedStoreAppointment[] = [];
  for (const tabConfig of SHEET2_TABS) {
    const rows = await fetchSheetTabCsv(APPOINTMENT_SPREADSHEET_ID, tabConfig.gid);
    if (rows.length === 0) continue;
    const [headerRow, ...dataRows] = rows;
    const outcomeColumns = OUTCOME_SOURCE_COLUMNS[tabConfig.gid];
    if (!outcomeColumns) {
      throw new Error(`No OUTCOME_SOURCE_COLUMNS entry for gid=${tabConfig.gid} (${tabConfig.title}).`);
    }
    dataRows.forEach((row, i) => {
      const parsed = parseAppointmentRow(tabConfig, outcomeColumns, headerRow, row, i + 1);
      if (parsed) appointments.push(parsed);
    });
  }
  return appointments;
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
