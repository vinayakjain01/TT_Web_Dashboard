import type { TabConfig } from "@/lib/business/types";

/**
 * In-scope Lead Funnel tabs within the lead spreadsheet
 * (1NvXaOurTqKPYpndiIhCfszfB8V_U0iRhhVVa5aBhXgQ) - same idea as config/sheet2Tabs.ts for
 * Store Appointments, now that leads spans more than one tab too.
 *
 * "Tarun Tahiliani" is the original tab - its raw dates always carry an explicit year
 * ("24 Jan 2025"), so year/monthIndex here are never actually used as a fallback for it;
 * kept anyway so every entry in this list has the same shape.
 *
 * "TT AUGUST" is a month-only tab - every date cell reads e.g. "1 Aug" with no year.
 * Confirmed via the sheet's gviz endpoint (which exposes the underlying cell value, not
 * just its "d mmm" display format) that this resolves to 2026 internally
 * (Date(2026,7,1)) - see lib/business/dates.ts's parseLeadDateWithTabYear.
 *
 * To add next month's tab: open the lead spreadsheet, find the new tab's gid from its
 * URL (...#gid=XXXXXXXXX), and append an entry below with its title, year, and
 * monthIndex (0 = January). Confirm its column layout matches parseLeadRow's assumed
 * 18-column positional layout first (S.NO, Date, Customer Name, Source, Country, Phone
 * Number, Follow-up Date, Status, Potential Order Amount, Sale Amount, Payment Mode,
 * Lead Added by, Lead Converted by, Notes - Reason For Refusal, Brand, Sales Target,
 * City, Product Category) - if it doesn't, parseLeadRow needs updating too, not just
 * this list.
 */
export const LEAD_TABS: TabConfig[] = [
  { gid: "1816174605", title: "Tarun Tahiliani", year: 2025, monthIndex: 0 },
  { gid: "847399955", title: "TT AUGUST", year: 2026, monthIndex: 7 },
  { gid: "1317353555", title: "TT September", year: 2026, monthIndex: 8 },
];
