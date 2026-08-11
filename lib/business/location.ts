// Explicit, hand-verified mapping table (rule 4) - built from direct inspection of the
// real values across all 8 in-scope Store Appointments tabs. Anything not listed here
// passes through as its own city bucket AND gets flagged for manual review; nothing is
// ever silently folded into an existing city.

const CITY_MAP: Record<string, string> = {
  delhi: "Delhi",
  "new delhi": "Delhi",
  mehrauli: "Delhi",
  meharuli: "Delhi",
  mehurali: "Delhi",

  mumbai: "Mumbai",
  juhu: "Mumbai",
  fort: "Mumbai",
  colaba: "Mumbai",
  "kala ghoda": "Mumbai",

  bangalore: "Bangalore",
  bengaluru: "Bangalore",

  hyderabad: "Hyderabad",
  hyd: "Hyderabad",

  kolkata: "Kolkata",
};

// Called out explicitly in the brief as ambiguous - never auto-resolved.
const FORCE_REVIEW = new Set(["ballard", "ballard estate"]);

export interface ResolvedLocation {
  city: string;
  needsReview: boolean;
}

export function resolveCity(raw: string): ResolvedLocation {
  const trimmed = raw.trim();
  if (!trimmed) {
    // Previously silently passed through as "" with no flag - a blank location is
    // just as unresolved as an unrecognized one, and hiding it that way meant it never
    // reached location_needs_review at all.
    return { city: "Unknown", needsReview: true };
  }
  const key = trimmed.toLowerCase();
  if (FORCE_REVIEW.has(key)) {
    return { city: trimmed, needsReview: true };
  }
  const mapped = CITY_MAP[key];
  if (mapped) {
    return { city: mapped, needsReview: false };
  }
  return { city: trimmed, needsReview: true };
}
