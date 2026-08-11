import { parseLeadDate } from "./dates";
import { toPhoneKey } from "./phone";
import { isTestRecord } from "./testRecord";
import type { ParsedLead } from "./types";

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Spreadsheet 1 has one stable column layout for its single in-scope tab, confirmed by
 * direct inspection - parsed positionally rather than by header name:
 * [0] unlabeled index/divider marker, [1] Date, [2] Customer Name, [3] Source,
 * [4] Country, [5] Phone Number, [6] Follow-up Date, [7] Status,
 * [8] Potential Order Amount (INR), [9] Sale Amount, [10] Payment Mode,
 * [11] Lead Added by, [12] Lead Converted by, [13] Notes - Reason For Refusal,
 * [14] Brand, [15] Sales Target, [16] City, [17] Product Category.
 *
 * Rows where both Date and Customer Name are blank are the interspersed month-header
 * divider rows (the marker text actually lives in column [0], not the Date column) -
 * these are filtered out entirely and this function returns null for them.
 */
export function parseLeadRow(row: string[], sourceRowIndex: number): ParsedLead | null {
  const dateRaw = clean(row[1]);
  const customerName = clean(row[2]);

  if (!dateRaw && !customerName) {
    return null; // divider/header row, not a real lead
  }

  const phoneRaw = clean(row[5]);
  const status = clean(row[7]);
  const statusLower = status.toLowerCase();
  const followUpDateRaw = clean(row[6]);

  return {
    sourceRowIndex,
    dateRaw,
    date: parseLeadDate(dateRaw),
    customerName,
    source: clean(row[3]),
    country: clean(row[4]),
    phoneRaw,
    phoneKey: phoneRaw ? toPhoneKey(phoneRaw) : null,
    followUpDateRaw,
    followUpDate: followUpDateRaw ? parseLeadDate(followUpDateRaw) : null,
    status,
    isConverted: statusLower.includes("converted"),
    isStoreAppointment: statusLower === "store appointment",
    potentialOrderAmount: parseAmount(clean(row[8])),
    saleAmount: parseAmount(clean(row[9])),
    paymentMode: clean(row[10]),
    leadAddedBy: clean(row[11]),
    leadConvertedBy: clean(row[12]),
    notesReasonForRefusal: clean(row[13]),
    brand: clean(row[14]),
    salesTarget: clean(row[15]),
    city: clean(row[16]),
    productCategory: clean(row[17]),
    isTestRecord: isTestRecord(customerName),
  };
}
