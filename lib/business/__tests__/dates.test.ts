import { describe, expect, it } from "vitest";
import { resolveBookingDate, resolveVisitDate } from "../dates";

describe("resolveVisitDate (rule 2)", () => {
  it("trusts an explicit year exactly, never overriding it with inferred logic", () => {
    // tab is JAN 2026, but this row explicitly says 2027 - must be respected as-is.
    const res = resolveVisitDate("5 Jan 2027", 2026, 0);
    expect(res.iso).toBe("2027-01-05");
    expect(res.needsReview).toBe(false);
  });

  it("assumes the tab's own year when the month is close and no year is given", () => {
    const res = resolveVisitDate("24 Jan", 2026, 0); // tab JAN 2026
    expect(res.iso).toBe("2026-01-24");
  });

  it("picks the adjacent year that keeps the date closest to the tab's month (April 2026 tab, visit reads 15 Dec)", () => {
    const res = resolveVisitDate("15 Dec", 2026, 3); // tab APRIL 2026, monthIndex 3
    expect(res.iso).toBe("2025-12-15"); // Dec 2025 is 4 months away vs Dec 2026's 8 months
  });

  it("flags a date range for review instead of guessing a single day", () => {
    const res = resolveVisitDate("10-11 June", 2026, 5);
    expect(res.iso).toBeNull();
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("date_range_or_relative");
  });

  it("flags a bare day-number with no month component for review", () => {
    const res = resolveVisitDate("1", 2026, 7);
    expect(res.iso).toBeNull();
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("no_month_component");
  });

  it("flags relative/non-date text like '1 week' for review", () => {
    const res = resolveVisitDate("1 week", 2026, 4);
    expect(res.needsReview).toBe(true);
  });
});

describe("resolveBookingDate (rule 2)", () => {
  it("uses the tab's year when that keeps booking on/before the resolved visit date", () => {
    const res = resolveBookingDate("24 Nov", 2026, "2026-01-05"); // tab JAN 2026 booking sheet
    expect(res.iso).toBe("2025-11-24"); // Nov 2026 would be AFTER the Jan 2026 visit
    expect(res.needsReview).toBe(false);
  });

  it("falls back to the prior year when the tab's own year would put booking after visit", () => {
    const res = resolveBookingDate("10 Jan", 2026, "2026-01-05");
    // tab-year candidate (2026-01-10) is after the visit (2026-01-05) -> try prior year
    expect(res.iso).toBe("2025-01-10");
    expect(res.needsReview).toBe(false);
  });

  it("flags for review rather than guessing when neither year keeps booking before visit", () => {
    const res = resolveBookingDate("10 June", 2026, "2025-01-05");
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("booking_after_visit_both_years");
  });

  it("respects an explicit year even if it disagrees with the visit date, but flags the inconsistency", () => {
    const res = resolveBookingDate("10 June 2026", 2026, "2026-01-05");
    expect(res.iso).toBe("2026-06-10");
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("booking_after_visit_both_years");
  });
});
