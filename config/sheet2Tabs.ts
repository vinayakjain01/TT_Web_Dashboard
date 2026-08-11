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
 * Rule 5 says "Follow up Date" holds the outcome narrative - true only for the JAN 2026
 * tab. Direct inspection of every tab found the real narrative lives somewhere else in
 * 7 of 8 months: "Follow up Date" instead holds an actual follow-up call date in Feb,
 * March, April, May and August; is blank in June; and doesn't exist in July. The real
 * narrative is in "Notes" for Feb/March/April/May/June/July, and split across
 * "Product detail" + "Follow up" in August (the initial call outcome and a later
 * update, respectively - both matter, e.g. an August row's "Product detail" reads
 * "Called, Appt confirmed" while its "Follow up" reveals "Called, purchased...").
 *
 * When a new tab is added, inspect its actual data (not just its headers) before
 * assuming which column(s) hold the real outcome text - header labels have proven
 * unreliable on their own here.
 */
export const OUTCOME_SOURCE_COLUMNS: Record<string, string[]> = {
  "1956565409": ["Follow up Date"],
  "2035635007": ["Notes"],
  "1830105006": ["Notes"],
  "291907416": ["Notes", "Notes.1"],
  "1176331367": ["Notes", "Notes.1"],
  "872360029": ["Notes", "Notes.1"],
  "883251673": ["Notes", "Notes.1"],
  "1861370203": ["Product detail", "Follow up"],
};
