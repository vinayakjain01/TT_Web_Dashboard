import type { TabConfig } from "@/lib/business/types";

/**
 * Ground truth for the 8 in-scope Store Appointments tabs, resolved once by
 * cross-referencing each gid's real tab title (Google's Sheets API equivalent of
 * spreadsheets.get -> sheets.properties.title, done here without a service account by
 * matching distinctive row content against a full-workbook export). Tab titles don't
 * change after creation, so this is safe to hardcode - but a new tab is added every
 * month, so THIS FILE MUST BE UPDATED when that happens.
 *
 * To add next month's tab: open the Store Appointments spreadsheet, find the new tab's
 * gid from its URL (...#gid=XXXXXXXXX), and append an entry below with that gid, its
 * title, year and monthIndex (0 = January). Then add its outcome-source column(s) to
 * OUTCOME_SOURCE_COLUMNS - inspect the tab first; don't assume "Follow up Date" is the
 * outcome column, see the note below.
 */
export const SHEET2_TABS: TabConfig[] = [
  { gid: "1956565409", title: "JAN 2026", year: 2026, monthIndex: 0 },
  { gid: "2035635007", title: "Feb 2026", year: 2026, monthIndex: 1 },
  { gid: "1830105006", title: "March 2026", year: 2026, monthIndex: 2 },
  { gid: "291907416", title: "April 2026", year: 2026, monthIndex: 3 },
  { gid: "1176331367", title: "May 2026", year: 2026, monthIndex: 4 },
  { gid: "872360029", title: "June 2026", year: 2026, monthIndex: 5 },
  { gid: "883251673", title: "July 2026", year: 2026, monthIndex: 6 },
  { gid: "1861370203", title: "August 2026", year: 2026, monthIndex: 7 },
];

/**
 * Rule 5 says "Follow up Date" holds the outcome narrative - that was true for the JAN
 * 2026 tab only when this was first built, and has already changed since: the client's
 * team renamed that column to "Notes" mid-month (verified by re-fetching the live
 * header - it now reads "...,Contact details ,Notes,Product detail,..." where it used
 * to read "...,Contact details ,Follow up Date ,Product detail,..."), which silently
 * broke outcome classification for the whole tab until this was caught by comparing
 * against a live browser screenshot. Column NAMES here are only as stable as whoever
 * edits the sheet - fetchParsedAppointments() now warns loudly if a tab's configured
 * columns stop resolving, but that only catches it after the fact.
 *
 * Direct inspection (at the time each entry below was last verified) found the real
 * outcome narrative in "Notes" for Feb/March/April/May/June/July/January, and split
 * across "Product detail" + "Follow up" in August (the initial call outcome and a
 * later update, respectively - both matter, e.g. an August row's "Product detail"
 * reads "Called, Appt confirmed" while its "Follow up" reveals "Called, purchased...").
 *
 * When a new tab is added, or if outcomes look wrong (e.g. everything reads "Other /
 * Uncategorized"), inspect that tab's actual current data - not just its headers, and
 * not just this file - before trusting which column(s) hold the real outcome text.
 */
export const OUTCOME_SOURCE_COLUMNS: Record<string, string[]> = {
  "1956565409": ["Notes"],
  "2035635007": ["Notes"],
  "1830105006": ["Notes"],
  "291907416": ["Notes", "Notes.1"],
  "1176331367": ["Notes", "Notes.1"],
  "872360029": ["Notes", "Notes.1"],
  "883251673": ["Notes", "Notes.1"],
  "1861370203": ["Product detail", "Follow up"],
};
