import { describe, expect, it } from "vitest";
import { parseFlexibleDate, resolveBookingDate, resolveVisitDate } from "../dates";

describe("resolveVisitDate (rule 2)", () => {
  it("trusts an explicit year exactly, never overriding it with inferred logic", () => {
    // tab is JAN 2026, but this row explicitly says 2027 - must be respected as-is.
    const res = resolveVisitDate("5 Jan 2027", 2026, 0);
    expect(res.iso).toBe("2027-01-05");
    expect(res.needsReview).toBe(false);
    expect(res.yearWasExplicit).toBe(true);
  });

  it("assumes the tab's own year when the month is close and no year is given", () => {
    const res = resolveVisitDate("24 Jan", 2026, 0); // tab JAN 2026
    expect(res.iso).toBe("2026-01-24");
    expect(res.yearWasExplicit).toBe(false);
  });

  it("picks the adjacent year that keeps the date closest to the tab's month (April 2026 tab, visit reads 15 Dec)", () => {
    const res = resolveVisitDate("15 Dec", 2026, 3); // tab APRIL 2026, monthIndex 3
    expect(res.iso).toBe("2025-12-15"); // Dec 2025 is 4 months away vs Dec 2026's 8 months
  });

  describe("bare day number, no month at all (new rule) - August 2026 tab writes just the day", () => {
    it("'1' resolves to day 1 of the tab's own month/year, not flagged for review", () => {
      // Real row shape from the August 2026 store-appointments tab: "Date of visit" cells
      // read just "1", "2", "3"... - the team stopped writing the month since everyone
      // already knows which tab they're in. Previously this fell through to
      // needsReview=true/no_month_component, which meant every one of these rows had a
      // null date_of_visit and silently dropped out of any Visit From/To filter.
      const res = resolveVisitDate("1", 2026, 7); // tab August 2026
      expect(res.iso).toBe("2026-08-01");
      expect(res.needsReview).toBe(false);
      expect(res.yearWasExplicit).toBe(false);
      expect(res.precision).toBe("exact");
    });

    it("'23' resolves to day 23", () => {
      const res = resolveVisitDate("23", 2026, 7);
      expect(res.iso).toBe("2026-08-23");
    });

    it("out-of-range numbers ('32', '0') are still not a valid day and stay flagged for review", () => {
      expect(resolveVisitDate("32", 2026, 7).needsReview).toBe(true);
      expect(resolveVisitDate("0", 2026, 7).needsReview).toBe(true);
    });
  });

  it("flags relative/non-date text like '1 week' (no month named) for review", () => {
    const res = resolveVisitDate("1 week", 2026, 4);
    expect(res.needsReview).toBe(true);
  });

  describe("date ranges (new rule) - first date used as the primary value, full range kept as a note", () => {
    it("day-day-month, no year: '7-11 jan' (real row, January 2025 tab)", () => {
      const res = resolveVisitDate("7-11 jan", 2025, 0);
      expect(res.iso).toBe("2025-01-07");
      expect(res.needsReview).toBe(false);
      expect(res.visitDateNote).toBe("7-11 jan");
      expect(res.precision).toBe("exact");
    });

    it("day-day-month, no year: '17-19 March'", () => {
      const res = resolveVisitDate("17-19 March", 2025, 0);
      expect(res.iso).toBe("2025-03-17");
      expect(res.visitDateNote).toBe("17-19 March");
    });

    it("month-day-day-year: 'Jan 10-13th 2025' (real row, January 2025 tab)", () => {
      const res = resolveVisitDate("Jan 10-13th 2025", 2025, 0);
      expect(res.iso).toBe("2025-01-10");
      expect(res.yearWasExplicit).toBe(true);
      expect(res.visitDateNote).toBe("Jan 10-13th 2025");
    });

    it("slash-separated range: '5/6 Dec' (real row, December 2025 tab)", () => {
      const res = resolveVisitDate("5/6 Dec", 2025, 11);
      expect(res.iso).toBe("2025-12-05");
    });

    it("'to'-separated range spanning two different months, year borrowed from the second half: '30 April to 11 May 2026'", () => {
      const res = resolveVisitDate("30 April to 11 May 2026", 2025, 2);
      expect(res.iso).toBe("2026-04-30");
      expect(res.yearWasExplicit).toBe(true);
      expect(res.visitDateNote).toBe("30 April to 11 May 2026");
    });
  });

  describe("vague/approximate dates (new rule) - no exact day given at all", () => {
    it("'March 1st week' defaults to the 1st and is flagged approximate (real row, January 2025 tab)", () => {
      const res = resolveVisitDate("March 1st week", 2025, 0);
      expect(res.iso).toBe("2025-03-01");
      expect(res.precision).toBe("approximate");
      expect(res.needsReview).toBe(false);
    });

    it("'July 1st week' (real row, June 2025 tab)", () => {
      const res = resolveVisitDate("July 1st week", 2025, 5);
      expect(res.iso).toBe("2025-07-01");
      expect(res.precision).toBe("approximate");
    });

    it("a normal precise date is never marked approximate", () => {
      const res = resolveVisitDate("24 Jan", 2026, 0);
      expect(res.precision).toBe("exact");
    });
  });

  describe("time-of-day text mixed into the cell (new rule) - stripped, date kept", () => {
    it("'2nd Jan. around 2pm' (real row, January 2025 tab)", () => {
      const res = resolveVisitDate("2nd Jan. around 2pm", 2025, 0);
      expect(res.iso).toBe("2025-01-02");
    });

    it("'Jan 29 12:00 PM'", () => {
      const res = resolveVisitDate("Jan 29 12:00 PM", 2025, 0);
      expect(res.iso).toBe("2025-01-29");
    });

    it("time BEFORE the date: '2 PM 20 JAN'", () => {
      const res = resolveVisitDate("2 PM 20 JAN", 2025, 0);
      expect(res.iso).toBe("2025-01-20");
    });

    it("period-separated minutes with an 'at' filler: '26th Feb at 11.00 am'", () => {
      const res = resolveVisitDate("26th Feb at 11.00 am", 2025, 1);
      expect(res.iso).toBe("2025-02-26");
    });

    it("comma before a trailing year, plus a time: 'March 15, 2025 at 11:00 AM'", () => {
      const res = resolveVisitDate("March 15, 2025 at 11:00 AM", 2025, 2);
      expect(res.iso).toBe("2025-03-15");
      expect(res.yearWasExplicit).toBe(true);
    });
  });
});

describe("parseFlexibleDate - comma before a trailing year", () => {
  it("'Jan 12, 2025' parses (real row, January 2025 tab)", () => {
    const res = parseFlexibleDate("Jan 12, 2025");
    expect(res).toEqual({ day: 12, monthIndex: 0, year: 2025 });
  });
});

describe("resolveBookingDate (rule 2)", () => {
  it("uses the tab's year when that keeps booking on/before the resolved visit date", () => {
    const res = resolveBookingDate("24 Nov", 2026, 0, "2026-01-05"); // tab JAN 2026 booking sheet
    expect(res.iso).toBe("2025-11-24"); // Nov 2026 would be AFTER the Jan 2026 visit
    expect(res.needsReview).toBe(false);
  });

  it("falls back to the prior year when the tab's own year would put booking after visit", () => {
    const res = resolveBookingDate("10 Jan", 2026, 0, "2026-01-05");
    // tab-year candidate (2026-01-10) is after the visit (2026-01-05) -> try prior year
    expect(res.iso).toBe("2025-01-10");
    expect(res.needsReview).toBe(false);
  });

  it("flags for review rather than guessing when neither year keeps booking before visit", () => {
    const res = resolveBookingDate("10 June", 2026, 0, "2025-01-05");
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("booking_after_visit_both_years");
  });

  it("respects an explicit year even if it disagrees with the visit date, but flags the inconsistency", () => {
    const res = resolveBookingDate("10 June 2026", 2026, 0, "2026-01-05");
    expect(res.iso).toBe("2026-06-10");
    expect(res.needsReview).toBe(true);
    expect(res.reason).toBe("booking_after_visit_both_years");
  });

  it("a booking whose month differs from the tab's month still gets the prior-year retry, even with an explicit visit year", () => {
    // Regression case found while building the fix below: tab is January 2025
    // (tabMonthIndex 0), booking "31st DEC" (month 11, no year), visit resolved from an
    // explicit-year range to 2025-01-10. This is completely ordinary - a booking made
    // on New Year's Eve for a visit a week and a half later - and must NOT be flagged
    // just because the visit's year happens to be explicit.
    const res = resolveBookingDate("31st DEC", 2025, 0, "2025-01-10", true);
    expect(res.iso).toBe("2024-12-31");
    expect(res.needsReview).toBe(false);
  });

  describe("explicit visit year restricts the prior-year fallback only when the booking's own month matches the tab's month (new rule - Soni Virdi case)", () => {
    it("flags for review instead of silently reinterpreting both dates a year earlier", () => {
      // Real row, January 2025 tab (tabMonthIndex 0): booking "24th Jan" (month 0, no
      // year - unambiguously this tab's year by construction), visit "24 February
      // 2024" (explicit year). The tab-year candidate (2025-01-24) is after the visit
      // (2024-02-24) - the OLD unconditional fallback would try 2024-01-24, which
      // happens to satisfy booking<=visit and would be accepted silently. That's wrong:
      // trusting the visit's explicit 2024 while ALSO quietly moving the booking to
      // 2024 (a year the sheet never stated for it) manufactures false consistency.
      const res = resolveBookingDate("24th Jan", 2025, 0, "2024-02-24", /* visitYearWasExplicit */ true);
      expect(res.needsReview).toBe(true);
      expect(res.reason).toBe("visit_year_explicit_inconsistent");
    });

    it("does not restrict the fallback when the visit's year was itself inferred (not explicit)", () => {
      // Same numbers as the always-passing test above, just spelling out the new
      // parameter explicitly as false - unaffected by the new rule.
      const res = resolveBookingDate("10 Jan", 2026, 0, "2026-01-05", false);
      expect(res.iso).toBe("2025-01-10");
      expect(res.needsReview).toBe(false);
    });
  });
});
