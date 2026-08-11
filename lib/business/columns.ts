function normalizeHeader(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Resolves a column by header label, tolerant of duplicate headers: "Notes" finds the
 * first column literally named "Notes"; "Notes.1" finds the second. This mirrors the
 * de-dup convention used in config/sheet2Tabs.ts, applied against the tab's own raw
 * header row rather than trusting any particular column position.
 */
export function resolveColumnIndex(headerRow: string[], label: string): number | null {
  const match = label.match(/^(.*)\.(\d+)$/);
  const baseLabel = match ? match[1] : label;
  const occurrence = match ? parseInt(match[2], 10) : 0;
  const target = normalizeHeader(baseLabel);

  let seen = 0;
  for (let i = 0; i < headerRow.length; i++) {
    if (normalizeHeader(headerRow[i]) === target) {
      if (seen === occurrence) return i;
      seen++;
    }
  }
  return null;
}

export function resolveAllColumnIndices(headerRow: string[], label: string): number[] {
  const target = normalizeHeader(label);
  const indices: number[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (normalizeHeader(headerRow[i]) === target) indices.push(i);
  }
  return indices;
}

export function cell(row: string[], index: number | null): string {
  if (index === null || index < 0 || index >= row.length) return "";
  return (row[index] ?? "").trim();
}

export function isRowBlank(row: string[]): boolean {
  return row.every((c) => !c || !c.trim());
}

/**
 * True if at least one configured outcome-source label still exists in this tab's
 * current header. False means the sheet's columns have drifted since the config was
 * last verified (a renamed/removed column) - every row would silently classify as
 * "Other / Uncategorized" rather than erroring, so callers should warn loudly instead
 * of trusting the result.
 */
export function outcomeColumnsResolve(headerRow: string[], outcomeColumns: string[]): boolean {
  return outcomeColumns.some((label) => resolveColumnIndex(headerRow, label) !== null);
}
