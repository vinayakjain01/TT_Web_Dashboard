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
  // 2025 (added in a second batch - fills out the full prior year alongside 2026 YTD)
  { gid: "543494584", title: "January 2025", year: 2025, monthIndex: 0 },
  { gid: "569420371", title: "Feb 2025", year: 2025, monthIndex: 1 },
  { gid: "1437623892", title: "March 2025", year: 2025, monthIndex: 2 },
  { gid: "955199524", title: "April 2025", year: 2025, monthIndex: 3 },
  { gid: "2047028092", title: "May 2025", year: 2025, monthIndex: 4 },
  { gid: "1497024218", title: "June 2025", year: 2025, monthIndex: 5 },
  { gid: "504028897", title: "July 2025", year: 2025, monthIndex: 6 },
  { gid: "464731955", title: "August 2025", year: 2025, monthIndex: 7 },
  { gid: "1404209415", title: "September 2025", year: 2025, monthIndex: 8 },
  { gid: "978911017", title: "October 2025", year: 2025, monthIndex: 9 },
  { gid: "511215138", title: "November 2025", year: 2025, monthIndex: 10 },
  { gid: "462844197", title: "December 2025", year: 2025, monthIndex: 11 },
  // 2026 YTD (original batch)
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
 *
 * The 2025 batch turned up yet more layouts: 6 of the 12 have no "Follow up Date"
 * column at all (outcome text lands inconsistently in "Product detail" or "Notes" row
 * by row within the same tab, so both are read and whichever is populated wins); 2 have
 * a uniquely-worded column ("Follow up Date & Remarks", "Follow up on 26 Nov") that
 * exists under that name for exactly one tab; and December 2025 mixes real dates and
 * outcome text in the SAME "Follow up Date" column depending on the row, with the
 * richer narrative in a second "Call Follow up" column - both are read there too.
 */
export const OUTCOME_SOURCE_COLUMNS: Record<string, string[]> = {
  // 2025
  "543494584": ["Product detail", "Notes"], // January 2025
  "569420371": ["Product detail", "Notes"], // Feb 2025
  "1437623892": ["Product detail", "Notes"], // March 2025
  "955199524": ["Product detail", "Notes"], // April 2025
  "2047028092": ["Product detail", "Notes"], // May 2025
  "1497024218": ["Product detail", "Notes"], // June 2025
  "504028897": ["Follow up Date & Remarks"], // July 2025
  "464731955": ["Follow up Date"], // August 2025
  "1404209415": ["Product detail", "Notes"], // September 2025
  "978911017": ["Product detail", "Notes"], // October 2025
  "511215138": ["Follow up on 26 Nov"], // November 2025
  "462844197": ["Follow up Date", "Call Follow up"], // December 2025
  // 2026
  "1956565409": ["Notes"],
  "2035635007": ["Notes"],
  "1830105006": ["Notes"],
  "291907416": ["Notes", "Notes.1"],
  "1176331367": ["Notes", "Notes.1"],
  "872360029": ["Notes", "Notes.1"],
  "883251673": ["Notes", "Notes.1"],
  "1861370203": ["Product detail", "Follow up"],
};
