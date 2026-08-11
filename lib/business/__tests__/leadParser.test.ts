import { describe, expect, it } from "vitest";
import { parseLeadRow } from "../leadParser";

// Real column order for the "Tarun Tahiliani" tab: [idx, Date, Customer Name, Source,
// Country, Phone Number, Follow-up Date, Status, Potential Order Amount, Sale Amount,
// Payment Mode, Lead Added by, Lead Converted by, Notes, Brand, Sales Target, City, Product Category]
function row(overrides: Partial<Record<number, string>>): string[] {
  const base = Array(18).fill("");
  for (const [k, v] of Object.entries(overrides)) base[Number(k)] = v;
  return base;
}

describe("parseLeadRow - divider rows", () => {
  it("filters out a month-header divider row (marker in the index column, Date+Name blank)", () => {
    const dividerRow = row({ 0: "Jun 2023", 14: "Tarun Tahiliani" });
    expect(parseLeadRow(dividerRow, 1)).toBeNull();
  });

  it("keeps a real row even when Customer Name is blank but Date is present", () => {
    // Real data has ~1000 rows with a genuine date and other fields but no name typed in -
    // these are messy leads, not divider rows, and should stay visible.
    const messyRow = row({ 1: "29 Jun 2023", 3: "Whatsapp", 5: "9925287428", 7: "Interested" });
    const parsed = parseLeadRow(messyRow, 2);
    expect(parsed).not.toBeNull();
    expect(parsed?.customerName).toBe("");
  });
});

describe("parseLeadRow - test records (rule 1)", () => {
  it("flags 'test 490' as a test record but still returns it as a visible row", () => {
    const testRow = row({ 1: "1 Jan 2026", 2: "test 490", 7: "Converted" });
    const parsed = parseLeadRow(testRow, 3);
    expect(parsed).not.toBeNull();
    expect(parsed?.isTestRecord).toBe(true);
    expect(parsed?.isConverted).toBe(true); // detail view shows it as-is
  });

  it("computing conversion rate with vs without the test-record filter must differ", () => {
    const rows = [
      row({ 1: "1 Jan 2026", 2: "Real Customer", 7: "Converted" }),
      row({ 1: "2 Jan 2026", 2: "test 525", 7: "Converted" }),
      row({ 1: "3 Jan 2026", 2: "Another Customer", 7: "Interested" }),
    ];
    const leads = rows.map((r, i) => parseLeadRow(r, i + 1)!);
    const rateIncludingTest = leads.filter((l) => l.isConverted).length / leads.length;
    const realLeads = leads.filter((l) => !l.isTestRecord);
    const rateExcludingTest = realLeads.filter((l) => l.isConverted).length / realLeads.length;
    expect(rateIncludingTest).not.toBeCloseTo(rateExcludingTest);
    expect(rateExcludingTest).toBeCloseTo(1 / 2);
  });
});

describe("parseLeadRow - conversion status", () => {
  it("treats 'SV - Converted' as converted too, not just the exact literal 'Converted'", () => {
    const parsed = parseLeadRow(row({ 1: "1 Jan 2026", 2: "Someone", 7: "SV - Converted" }), 1);
    expect(parsed?.isConverted).toBe(true);
  });

  it("identifies Store Appointment status exactly", () => {
    const parsed = parseLeadRow(row({ 1: "1 Jan 2026", 2: "Someone", 7: "Store Appointment" }), 1);
    expect(parsed?.isStoreAppointment).toBe(true);
  });
});

describe("parseLeadRow - amounts and dates", () => {
  it("parses Indian-style comma amounts", () => {
    const parsed = parseLeadRow(row({ 1: "1 Jan 2026", 2: "Someone", 8: "3,48,336" }), 1);
    expect(parsed?.potentialOrderAmount).toBe(348336);
  });

  it("parses lowercase/abbreviated month names like 'sept'", () => {
    const parsed = parseLeadRow(row({ 1: "25 sept 2025", 2: "Someone" }), 1);
    expect(parsed?.date).toBe("2025-09-25");
  });

  it("parses ordinal-suffixed dates", () => {
    const parsed = parseLeadRow(row({ 1: "1st May 2024", 2: "Someone" }), 1);
    expect(parsed?.date).toBe("2024-05-01");
  });
});
