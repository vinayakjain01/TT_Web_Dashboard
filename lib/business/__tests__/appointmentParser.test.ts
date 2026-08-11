import { describe, expect, it } from "vitest";
import { OUTCOME_SOURCE_COLUMNS, SHEET2_TABS } from "@/config/sheet2Tabs";
import { parseAppointmentRow } from "../appointmentParser";

// The live sheet's JAN 2026 header was originally "...,Contact details ,Follow up
// Date ,Product detail,..." (matching the brief's literal example) but the client's
// team renamed that column to "Notes" mid-project - this fixture reflects the current
// reality (two "Notes" columns: the first holds the real outcome text).
const janHeader = [
  "SL. No", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
  "Notes", "Product detail", "Price details", "Notes", "Visited (Yes/no)",
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
  it("JAN 2026: reads outcome from 'Notes' (the column formerly named 'Follow up Date', renamed live mid-project)", () => {
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

// Real header for the January 2025 tab (and the same shape for the other 5 tabs whose
// outcome text lands in Product detail/Notes rather than a Follow-up-Date-style column).
const jan2025Header = [
  "SL. No", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
  "Product detail", "Price details", "Notes", "Visited (Yes/no)", "Order placed (yes/no)",
  "Client Reviews by store", "Style details",
];

describe("parseAppointmentRow - 2025 batch (12 new tabs)", () => {
  it("resolves a date range end to end (real January 2025 row: Priyanka Sikka)", () => {
    const row = ["#2", "31st DEC", "Priyanka Sikka", "Jan 10-13th 2025", "DELHI", "17157719334",
      "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("543494584"), OUTCOME_SOURCE_COLUMNS["543494584"], jan2025Header, row, 0);
    expect(parsed?.dateOfVisit).toBe("2025-01-10");
    expect(parsed?.visitDateNote).toBe("Jan 10-13th 2025");
    expect(parsed?.dateNeedsReview).toBe(false);
  });

  it("resolves a vague/approximate date end to end (real January 2025 row: Likhita Rao)", () => {
    const row = ["#17", "9th Jan", "Likhita Rao", "March 1st week", "MUMBAI", "393337638309",
      "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("543494584"), OUTCOME_SOURCE_COLUMNS["543494584"], jan2025Header, row, 0);
    expect(parsed?.dateOfVisit).toBe("2025-03-01");
    expect(parsed?.visitDatePrecision).toBe("approximate");
    expect(parsed?.dateNeedsReview).toBe(false);
  });

  it("resolves a time-embedded date end to end (real January 2025 row: Gitika Chanchlani)", () => {
    const row = ["#4", "31st DEC", "Gitika Chanchlani", "2nd Jan. around 2pm", "MUMBAI", "9008448448",
      "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("543494584"), OUTCOME_SOURCE_COLUMNS["543494584"], jan2025Header, row, 0);
    expect(parsed?.dateOfVisit).toBe("2025-01-02");
  });

  it("routes the Soni Virdi row to date_needs_review instead of silently accepting the explicit-but-inconsistent visit year", () => {
    const row = ["#36", "24th Jan", "Soni Virdi", "24 February 2024", "Delhi", "447415107921",
      "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("543494584"), OUTCOME_SOURCE_COLUMNS["543494584"], jan2025Header, row, 0);
    expect(parsed?.dateOfVisit).toBe("2024-02-24"); // explicit year trusted for the visit itself
    expect(parsed?.dateNeedsReview).toBe(true);
    expect(parsed?.dateReviewReason).toBe("visit_year_explicit_inconsistent");
  });

  it("skips a section-divider row inside a Store Appointments tab (real December 2025 row)", () => {
    // "1st Week 1 December - 7 December 2025" sits alone in the first column; every
    // other column - including Name, Date of Booking, Date of visit - is blank.
    const dividerRow = ["1st Week 1 December - 7 December 2025", "", "", "", "", "", "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("462844197"), OUTCOME_SOURCE_COLUMNS["462844197"], jan2025Header, dividerRow, 0);
    expect(parsed).toBeNull();
  });

  it("still parses a real row from the same tab as the divider above (Mritika Easwar)", () => {
    const decHeader = [
      "SL. No", "Date of Booking", "Name", "Date of visit", "Store location", "Contact details",
      "Follow up Date", "Call Follow up", "Product detail", "Price details", "Notes",
      "Visited (Yes/no)", "Order placed (yes/no)", "Client Reviews by store", "Style details",
    ];
    const row = ["#1", "11 Nov", "Mritika Easwar P", "3 Dec", "Hyderabad", "98426 66799",
      "Will visit on 5th again", "Did not purchase anything at the store", "", "", "", "", "", "", ""];
    const parsed = parseAppointmentRow(tab("462844197"), OUTCOME_SOURCE_COLUMNS["462844197"], decHeader, row, 1);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Mritika Easwar P");
    expect(parsed?.city).toBe("Hyderabad");
    expect(parsed?.visitOutcome).toBe("Visited, No Purchase"); // "Did not purchase anything" - negation-aware
  });
});
