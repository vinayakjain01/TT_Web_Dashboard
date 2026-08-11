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

function stripTimeSuffix(s: string): string {
  // "17 Feb 2:00 PM" -> "17 Feb"
  return s.replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/i, "").trim();
}

function stripOrdinalSuffix(s: string): string {
  // "1st", "22nd", "3rd", "14th" -> "1", "22", "3", "14"
  return s.replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
}

/**
 * Parses a single human-entered date fragment like "9 Feb 2021", "1st May 2024",
 * "25 sept 2025", "1July", "12 Jun2026", "24 Nov" (no year).
 * Returns null for anything that isn't a single resolvable calendar date:
 * ranges ("10-11 June"), day-lists ("18,19,20"), bare numbers with no month ("1"),
 * relative text ("1 week", "TBH"), or anything else that doesn't tokenize cleanly.
 */
export function parseFlexibleDate(raw: string): FlexibleDate | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  // Reject obvious non-dates and ranges outright - these need a human, not a guess.
  if (/[-/]/.test(s) && /\d.*[-/].*\d/.test(s)) return null; // "10-11 June", "16/17 Feb"
  if (/,/.test(s) && !/,\s*\d{4}$/.test(s)) return null; // "18,19,20" (but allow trailing ", 2026" style - none observed, safe)
  if (/\bweek\b/i.test(s)) return null; // "1 week"
  if (/^(tbh|tbd|na|n\/a)$/i.test(s)) return null;

  s = stripTimeSuffix(s);
  s = stripOrdinalSuffix(s);
  s = s.trim();
  if (!s) return null;

  // Insert a space between digits and letters when missing: "1July" -> "1 July", "12Jun2026" -> "12 Jun 2026"
  s = s.replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2");
  s = s.replace(/\s+/g, " ").trim();

  const tokens = s.split(" ").filter(Boolean);
  if (tokens.length < 2) return null; // bare day number, no month - not resolvable without guessing

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
      if (n >= 1 && n <= 31 && day === null) {
        day = n;
      }
      continue;
    }
    const monthKey = tok.toLowerCase().replace(/\./g, "");
    if (monthKey in MONTH_MAP) {
      monthIndex = MONTH_MAP[monthKey];
    }
  }

  if (day === null || monthIndex === null) return null;
  return { day, monthIndex, year };
}

export function flexibleDateToIso(d: FlexibleDate, fallbackYear: number): string {
  const y = d.year ?? fallbackYear;
  const mm = String(d.monthIndex + 1).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Lead-sheet dates always carry an explicit year in practice. Parses and returns
 * an ISO date, or null if the raw text isn't a resolvable single date.
 */
export function parseLeadDate(raw: string): string | null {
  const parsed = parseFlexibleDate(raw);
  if (!parsed) return null;
  // If the sheet ever omits a year, we have no tab-title anchor to fall back on here -
  // rather than silently assuming "this year", surface it as unparseable.
  if (parsed.year === null) return null;
  return flexibleDateToIso(parsed, parsed.year);
}

function classifyUnparseableReason(raw: string): "unparseable_raw_value" | "no_month_component" | "date_range_or_relative" {
  if (!raw) return "unparseable_raw_value";
  if (/\d/.test(raw) && !/[A-Za-z]/.test(raw)) return "no_month_component";
  return "date_range_or_relative";
}

export interface VisitDateResolution {
  iso: string | null;
  needsReview: boolean;
  reason: null | "unparseable_raw_value" | "no_month_component" | "date_range_or_relative";
}

/**
 * Rule 2 (visit date): trust an explicit year if present. Otherwise, of the tab's own
 * year and its two neighbors, pick whichever puts the resolved month closest (in actual
 * elapsed months, not calendar-year-blind) to the tab's own month - this is what makes a
 * "tab is April 2026, visit reads 15 Dec" case resolve to December 2025, not 2026.
 */
export function resolveVisitDate(raw: string, tabYear: number, tabMonthIndex: number): VisitDateResolution {
  const parsed = parseFlexibleDate(raw);
  if (!parsed) {
    return { iso: null, needsReview: true, reason: classifyUnparseableReason(raw) };
  }
  if (parsed.year !== null) {
    return { iso: flexibleDateToIso(parsed, parsed.year), needsReview: false, reason: null };
  }

  const candidates = [-1, 0, 1].map((yearOffset) => ({
    year: tabYear + yearOffset,
    distance: Math.abs(parsed.monthIndex - tabMonthIndex + yearOffset * 12),
  }));
  candidates.sort((a, b) => a.distance - b.distance);
  const chosenYear = candidates[0].year;

  return { iso: flexibleDateToIso(parsed, chosenYear), needsReview: false, reason: null };
}

export interface BookingDateResolution {
  iso: string | null;
  needsReview: boolean;
  reason: null | "unparseable_raw_value" | "no_month_component" | "date_range_or_relative" | "booking_after_visit_both_years";
}

/**
 * Rule 2 (booking date): a booking can't logically occur after its own resolved visit
 * date. Try the tab's year first; if that puts booking after visit, try the prior year.
 * If neither works, flag for review instead of guessing.
 */
export function resolveBookingDate(raw: string, tabYear: number, resolvedVisitIso: string | null): BookingDateResolution {
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
  const candidatePriorYear = flexibleDateToIso(parsed, tabYear - 1);
  if (candidatePriorYear <= resolvedVisitIso) {
    return { iso: candidatePriorYear, needsReview: false, reason: null };
  }
  return { iso: candidateTabYear, needsReview: true, reason: "booking_after_visit_both_years" };
}
