// Shared between the appointments summary and charts API routes (both need to know
// "was this a visit" / "was this a purchase" from the same two rows of logic) - kept
// in one place so the two routes can't quietly drift into different definitions.

function isYes(flag: string): boolean {
  return /^y/i.test(flag.trim());
}

export function isVisited(a: { visit_outcome: string; visited_flag_raw: string }): boolean {
  return a.visit_outcome === "Purchased" || a.visit_outcome === "Visited, No Purchase" || isYes(a.visited_flag_raw);
}

export function isPurchased(a: { visit_outcome: string; order_placed_flag_raw: string }): boolean {
  return a.visit_outcome === "Purchased" || isYes(a.order_placed_flag_raw);
}
