import type { VisitOutcome } from "./types";

/**
 * Derives visit_outcome from the free-text "Follow up Date" column (rule 5).
 *
 * Deviates from a literal "contains 'purchas' -> Purchased" rule: real rows like
 * "Visted, did not Purchase" and "Did not purchase at store" contain "purchas" but mean
 * the opposite. A negated-purchase phrase is checked first so those route to
 * "Visited, No Purchase" instead of inflating the Purchased count.
 */
const PURCHASE_INDICATOR = /(purchas|placed the order|order placed)/;
const NEGATION_BEFORE = /(did\s*n[o']?t|didn['’]?t|\bnot\b|couldn['’]?t|could\s*n[o']?t)[^.]*$/;

export function classifyVisitOutcome(raw: string): VisitOutcome {
  const text = raw.toLowerCase();
  if (!text.trim()) return "Other / Uncategorized";

  const purchaseMatch = text.match(PURCHASE_INDICATOR);
  if (purchaseMatch) {
    const before = text.slice(0, purchaseMatch.index);
    if (NEGATION_BEFORE.test(before)) {
      return "Visited, No Purchase";
    }
    return "Purchased";
  }
  if (text.includes("visted") || text.includes("visited") || /\bwent\b/.test(text)) {
    return "Visited, No Purchase";
  }
  if (
    text.includes("no answer") ||
    text.includes("no ans") ||
    text.includes("no reply") ||
    text.includes("not respond") ||
    text.includes("did not visit") ||
    text.includes("didn't visit") ||
    /(cannot|can't|couldn't|could\s*n[o']?t)\s+visit/.test(text)
  ) {
    return "Not Reached / No Visit";
  }
  if (/will\s+(re\s*)?visit/.test(text) || /would\s+(be\s+)?(re\s*)?visit/.test(text) || text.includes("reschedul")) {
    return "Pending / Rescheduled";
  }
  return "Other / Uncategorized";
}
