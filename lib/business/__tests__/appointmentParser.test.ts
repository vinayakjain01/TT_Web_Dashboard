import { describe, expect, it } from "vitest";
import { OUTCOME_SOURCE_COLUMNS, SHEET2_TABS } from "@/config/sheet2Tabs";
import { parseAppointmentRow } from "../appointmentParser";

const janHeader = [
  "SL. No", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
  "Follow up Date", "Product detail", "Price details", "Notes", "Visited (Yes/no)",
  "Order placed (yes/no)", "Client Reviews by store", "Style details",
];

const febHeader = [
  " ", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
  "Follow up Date", "Product detail", "Price details", "Notes", "Visited (Yes/no)",
  "Order placed (yes/no)", "Client Reviews by store", "Style details",
];

const augustHeader = [
  "SL. No", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
  "Email", "Follow up Date", "Product detail", "Follow up", "Notes", "Visited (Yes/no)",
  "Order placed (yes/no)", "Client Reviews by store", "Style details",
];

function tab(gid: string) {
  return SHEET2_TABS.find((t) => t.gid === gid)!;
}

describe("parseAppointmentRow - per-tab column mapping", () => {
  it("JAN 2026: reads outcome from 'Follow up Date' (the only tab where the brief's literal example holds)", () => {
    const row = ["#1", "24 Nov", "Sanskruti Jain", "5 Jan", "Delhi", "447586800876",
      "Visted, did not like and Purchase", "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("1956565409"), OUTCOME_SOURCE_COLUMNS["1956565409"], janHeader, row, 0);
    expect(parsed?.visitOutcome).toBe("Visited, No Purchase");
  });

  it("Feb 2026: 'Follow up Date' actually holds a real date here, not outcome text - real outcome is in Notes", () => {
    const row = ["#2", "6 Dec", "Rashim Gandhi", "17 Feb", "Delhi", "1 (647) 588-3714",
      "14 Jan", "", "Sent", "Called, no answer, visited did not purchase 21/2", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("2035635007"), OUTCOME_SOURCE_COLUMNS["2035635007"], febHeader, row, 0);
    expect(parsed?.visitOutcome).toBe("Visited, No Purchase");
    expect(parsed?.dateOfVisit).not.toBeNull(); // "17 Feb" is a real date, not swallowed as outcome text
  });

  it("August 2026: outcome is split across Product detail + Follow up, and a later purchase-confirming update must be picked up", () => {
    const row = ["#11", "29 July", "Ryana Kuruvilla", "5", "Delhi", "91 77710 09814",
      "Email", "5 Aug", "Called, Appt confirmed", "Called, purchased under name Rayana or rishina",
      "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("1861370203"), OUTCOME_SOURCE_COLUMNS["1861370203"], augustHeader, row, 0);
    expect(parsed?.visitOutcome).toBe("Purchased");
  });

  it("skips a fully blank row (the stray blank row found in the July 2026 tab)", () => {
    const blank = Array(14).fill("");
    const parsed = parseAppointmentRow(tab("883251673"), OUTCOME_SOURCE_COLUMNS["883251673"], janHeader, blank, 0);
    expect(parsed).toBeNull();
  });

  it("reads the SL.No column positionally even when its header is garbage (June 2026's stray name)", () => {
    const row = ["#1", "27 April", "Rani", "TBH", "Delhi", "44 7801 930225", "", "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("872360029"), OUTCOME_SOURCE_COLUMNS["872360029"], janHeader, row, 0);
    expect(parsed?.slNoRaw).toBe("#1");
    expect(parsed?.dateOfVisit).toBeNull(); // "TBH" is not a resolvable date
    expect(parsed?.dateNeedsReview).toBe(true);
  });

  it("splits a multi-phone contact cell and flags location for review (real June 2026 row)", () => {
    const row = ["#7", "15 May", "Tamanna Kanjani", "29-30 june", "Delhi",
      "971588677424 / 971509103131", "", "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("872360029"), OUTCOME_SOURCE_COLUMNS["872360029"], janHeader, row, 0);
    expect(parsed?.primaryPhoneKey).not.toBe(parsed?.secondaryPhoneKey);
    expect(parsed?.secondaryPhoneKey).not.toBeNull();
  });
});
