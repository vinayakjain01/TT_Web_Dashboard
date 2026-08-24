// Robust, dependency-free date parsing for the messy formats found in both spreadsheets.
// Never guesses a date it can't defend - callers use the null/reason to route rows to review.

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export interface FlexibleDate {
  day: number;
  monthIndex: number; // 0-11
  year: number | null; // null if not present in the raw text
}

// "17 Feb 2:00 PM", "2nd Jan. around 2pm", "2 PM 20 JAN", "26th Feb at 11.00 am" -
// strips a time-of-day mention anywhere in the string (before, after, with or without
// minutes, colon- or period-separated minutes, with or without a leading filler word).
// Time is never needed downstream - only the date portion is kept.
function stripTimeSuffix(s: string): string {
  return s.replace(/\b(?:around|approx\.?|approximately|at)?\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)\b\.?/gi, " ").trim();
}

function stripOrdinalSuffix(s: string): string {
  // "1st", "22nd", "3rd", "14th" -> "1", "22", "3", "14"
  return s.replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
}

/** Extracts whatever day/month/year tokens can be found, without requiring all three. */
function extractPartialDate(raw: string): { day: number | null; monthIndex: number | null; year: number | null } {
  let s = raw.replace(/[.,]/g, " ");
  s = stripOrdinalSuffix(s);
  s = s.replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2");
  const tokens = s.split(/\s+/).filter(Boolean);

  let day: number | null = null;
  let monthIndex: number | null = null;
  let year: number | null = null;

  for (const tok of tokens) {
    if (/^\d{3,4}$/.test(tok)) {
      const n = parseInt(tok, 10);
      year = n < 100 ? 2000 + n : n;
      continue;
    }
    if (/^\d{1,2}$/.test(tok)) {
      const n = parseInt(tok, 10);
      if (n >= 1 && n <= 31 && day === null) day = n;
      continue;
    }
    const monthKey = tok.toLowerCase();
    if (monthKey in MONTH_MAP) monthIndex = MONTH_MAP[monthKey];
  }

  return { day, monthIndex, year };
}

/**
 * Parses a single human-entered date fragment like "9 Feb 2021", "1st May 2024",
 * "25 sept 2025", "1July", "12 Jun2026", "24 Nov" (no year), "Jan 12, 2025".
 * Returns null for anything that isn't a single resolvable calendar date:
 * ranges ("10-11 June"), day-lists ("18,19,20"), bare numbers with no month ("1"),
 * relative text ("1 week", "TBH"), or anything else that doesn't tokenize cleanly.
 */
export function parseFlexibleDate(raw: string): FlexibleDate | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  // Strip time-of-day text FIRST - "March 15, 2025 at 11:00 AM" must not be rejected
  // by the comma/trailing-year check below just because trailing time text means the
  // string doesn't end right after the year.
  s = stripTimeSuffix(s);
  if (!s) return null;

  // Reject obvious non-dates and ranges outright - these need a human, not a guess.
  if (/[-/]/.test(s) && /\d.*[-/].*\d/.test(s)) return null; // "10-11 June", "16/17 Feb"
  if (/,/.test(s) && !/,\s*\d{4}$/.test(s)) return null; // "18,19,20" (but allow trailing ", 2025" style, e.g. "Jan 12, 2025")
  if (/\bweek\b/i.test(s)) return null; // "1 week", "March 1st week"
  if (/^(tbh|tbd|na|n\/a)$/i.test(s)) return null;

  const { day, monthIndex, year } = extractPartialDate(s);
  if (day === null || monthIndex === null) return null;
  return { day, monthIndex, year };
}

/**
 * Detects a vague, no-specific-day date like "March 1st week" or "July 1st week" -
 * a month is named but no single day is actually given (the "1st"/"2nd" refers to
 * which week, not a day of month). Returns null for anything else, including normal
 * dates that happen to also be near "week" in unrelated text (that text lives in a
 * different column and never reaches this function).
 */
function detectVagueMonthWeek(raw: string): { monthIndex: number; year: number | null } | null {
  if (!/\bweek\b/i.test(raw)) return null;
  const { monthIndex, year } = extractPartialDate(raw.replace(/\bweek\b/i, " "));
  if (monthIndex === null) return null;
  return { monthIndex, year };
}

export interface DateRangeFirst {
  day: number;
  monthIndex: number;
  year: number | null;
  rawRange: string;
}

/**
 * Extracts the FIRST date out of a range like "Jan 10-13th 2025", "7-11 jan",
 * "17-19 March", "5/6 Dec", or "30 April to 11 May 2026" - a day must come from the
 * left side (that's what makes it "first"), but the month/year can be borrowed from
 * the right side when the left side doesn't state its own (e.g. "7-11 jan" has no
 * month on the "7" side). Returns null if the text isn't shaped like a range at all.
 */
function parseDateRangeFirst(raw: string): DateRangeFirst | null {
  const match = raw.match(/^(.*?)\s*(?:-|\/|\bto\b)\s*(.+)$/i);
  if (!match) return null;
  const left = extractPartialDate(match[1]);
  const right = extractPartialDate(match[2]);
  const day = left.day;
  const monthIndex = left.monthIndex ?? right.monthIndex;
  const year = left.year ?? right.year;
  if (day === null || monthIndex === null) return null;
  return { day, monthIndex, year, rawRange: raw.trim() };
}

export function flexibleDateToIso(d: FlexibleDate, fallbackYear: number): string {
  const y = d.year ?? fallbackYear;
  const mm = String(d.monthIndex + 1).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Parses a lead-sheet date and resolves its year. An explicit year in the raw text
 * always wins; a tab whose own dates never write down a year at all (e.g. "TT AUGUST":
 * every cell reads "1 Aug", "23 Aug" - confirmed against the sheet's underlying date
 * value via the gviz endpoint, which resolves "1 Aug" in that tab to 2026) falls back to
 * the tab's own year context via pickClosestYear, the same mechanism
 * resolveVisitDate/resolveBookingDate already use for appointment tabs, rather than
 * giving up. Returns null if the raw text isn't a resolvable single date.
 */
export function parseLeadDateWithTabYear(raw: string, tabYear: number, tabMonthIndex: number): string | null {
  const parsed = parseFlexibleDate(raw);
  if (!parsed) return null;
  const year = parsed.year ?? pickClosestYear(parsed.monthIndex, tabYear, tabMonthIndex);
  return flexibleDateToIso(parsed, year);
}

export type DateReviewReasonCode =
  | "unparseable_raw_value"
  | "no_month_component"
  | "date_range_or_relative"
  | "booking_after_visit_both_years"
  | "visit_year_explicit_inconsistent";

function classifyUnparseableReason(raw: string): "unparseable_raw_value" | "no_month_component" | "date_range_or_relative" {
  if (!raw) return "unparseable_raw_value";
  if (/\d/.test(raw) && !/[A-Za-z]/.test(raw)) return "no_month_component";
  return "date_range_or_relative";
}

/** Of the tab's own year and its two neighbors, picks whichever keeps monthIndex closest
 * (in real elapsed months, not calendar-year-blind) to the tab's own month. */
export function pickClosestYear(monthIndex: number, tabYear: number, tabMonthIndex: number): number {
  const candidates = [-1, 0, 1].map((yearOffset) => ({
    year: tabYear + yearOffset,
    distance: Math.abs(monthIndex - tabMonthIndex + yearOffset * 12),
  }));
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].year;
}

export interface VisitDateResolution {
  iso: string | null;
  needsReview: boolean;
  reason: DateReviewReasonCode | null;
  /** True if the resolved year came from an explicit year in the raw text itself,
   * rather than being inferred from the tab's own year/month context. */
  yearWasExplicit: boolean;
  /** The full original range text, when the raw value was a date range - the range
   * isn't lost, it's just not used for date arithmetic beyond its first date. */
  visitDateNote: string | null;
  precision: "exact" | "approximate";
}

/**
 * Rule 2 (visit date): trust an explicit year if present. Otherwise, of the tab's own
 * year and its two neighbors, pick whichever puts the resolved month closest to the
 * tab's own month - this is what makes a "tab is April 2026, visit reads 15 Dec" case
 * resolve to December 2025, not 2026.
 *
 * Also handles three patterns found in later batches of tabs, layered on top of the
 * above (never replacing it): vague "<month> <n>th week" dates default to the 1st of
 * that month and are flagged approximate; date ranges use their first date as the
 * primary value and keep the full range text in visitDateNote; time-of-day text mixed
 * into the cell is stripped before any of this runs.
 */
export function resolveVisitDate(raw: string, tabYear: number, tabMonthIndex: number): VisitDateResolution {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { iso: null, needsReview: true, reason: "unparseable_raw_value", yearWasExplicit: false, visitDateNote: null, precision: "exact" };
  }
  const timeStripped = stripTimeSuffix(trimmed);

  const vague = detectVagueMonthWeek(timeStripped);
  if (vague) {
    const chosenYear = vague.year ?? pickClosestYear(vague.monthIndex, tabYear, tabMonthIndex);
    return {
      iso: flexibleDateToIso({ day: 1, monthIndex: vague.monthIndex, year: chosenYear }, chosenYear),
      needsReview: false,
      reason: null,
      yearWasExplicit: vague.year !== null,
      visitDateNote: null,
      precision: "approximate",
    };
  }

  const range = parseDateRangeFirst(timeStripped);
  if (range) {
    const chosenYear = range.year ?? pickClosestYear(range.monthIndex, tabYear, tabMonthIndex);
    return {
      iso: flexibleDateToIso({ day: range.day, monthIndex: range.monthIndex, year: chosenYear }, chosenYear),
      needsReview: false,
      reason: null,
      yearWasExplicit: range.year !== null,
      visitDateNote: range.rawRange,
      precision: "exact",
    };
  }

  const parsed = parseFlexibleDate(raw);
  if (!parsed) {
    return { iso: null, needsReview: true, reason: classifyUnparseableReason(raw), yearWasExplicit: false, visitDateNote: null, precision: "exact" };
  }
  if (parsed.year !== null) {
    return { iso: flexibleDateToIso(parsed, parsed.year), needsReview: false, reason: null, yearWasExplicit: true, visitDateNote: null, precision: "exact" };
  }
  const chosenYear = pickClosestYear(parsed.monthIndex, tabYear, tabMonthIndex);
  return { iso: flexibleDateToIso(parsed, chosenYear), needsReview: false, reason: null, yearWasExplicit: false, visitDateNote: null, precision: "exact" };
}

export interface BookingDateResolution {
  iso: string | null;
  needsReview: boolean;
  reason: DateReviewReasonCode | null;
}

/**
 * Rule 2 (booking date): a booking can't logically occur after its own resolved visit
 * date. Try the tab's year first; if that puts booking after visit, try the prior year.
 * If neither works, flag for review instead of guessing.
 *
 * That prior-year retry is skipped - flagging for review instead - specifically when
 * the booking's own month is the SAME as the tab's own month AND the visit's year came
 * from an explicit value in its own raw text. When those both hold, the booking is
 * unambiguously this tab's year by construction (no adjacent-year guess to make), so a
 * conflict with an explicit visit year is a real inconsistency, not something a retry
 * should paper over - e.g. a January-2025 tab, booking "24th Jan" (no year, so
 * unambiguously Jan 2025), visit "24 February 2024" (explicit year) must not silently
 * resolve to booking=2024/visit=2024 just because that combination happens to satisfy
 * booking-before-visit. When the booking's month DIFFERS from the tab's month (e.g. a
 * "31 Dec" booking inside a January tab), the prior-year retry is exactly the kind of
 * ambiguity it exists to resolve, and stays allowed regardless of the visit's year.
 */
export function resolveBookingDate(
  raw: string,
  tabYear: number,
  tabMonthIndex: number,
  resolvedVisitIso: string | null,
  visitYearWasExplicit: boolean = false
): BookingDateResolution {
  const parsed = parseFlexibleDate(raw);
  if (!parsed) {
    return { iso: null, needsReview: true, reason: classifyUnparseableReason(raw) };
  }
  if (parsed.year !== null) {
    const iso = flexibleDateToIso(parsed, parsed.year);
    if (resolvedVisitIso && iso > resolvedVisitIso) {
      return { iso, needsReview: true, reason: "booking_after_visit_both_years" };
    }
    return { iso, needsReview: false, reason: null };
  }

  const candidateTabYear = flexibleDateToIso(parsed, tabYear);
  if (!resolvedVisitIso || candidateTabYear <= resolvedVisitIso) {
    return { iso: candidateTabYear, needsReview: false, reason: null };
  }

  if (visitYearWasExplicit && parsed.monthIndex === tabMonthIndex) {
    return { iso: candidateTabYear, needsReview: true, reason: "visit_year_explicit_inconsistent" };
  }

  const candidatePriorYear = flexibleDateToIso(parsed, tabYear - 1);
  if (candidatePriorYear <= resolvedVisitIso) {
    return { iso: candidatePriorYear, needsReview: false, reason: null };
  }
  return { iso: candidateTabYear, needsReview: true, reason: "booking_after_visit_both_years" };
}
