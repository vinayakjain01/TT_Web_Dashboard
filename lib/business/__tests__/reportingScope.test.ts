import { describe, expect, it } from "vitest";
import { isInLeadReportingScope } from "../reportingScope";

describe("isInLeadReportingScope - mirrors v_leads_recent's year filter", () => {
  it.each(["2025-01-01", "2025-12-31", "2026-01-01", "2026-08-11"])("%s is in scope", (date) => {
    expect(isInLeadReportingScope(date)).toBe(true);
  });

  it.each(["2024-12-31", "2021-02-08", "2027-01-01"])("%s is out of scope", (date) => {
    expect(isInLeadReportingScope(date)).toBe(false);
  });

  it("a null date (unparseable) is out of scope, not silently included", () => {
    expect(isInLeadReportingScope(null)).toBe(false);
  });
});
