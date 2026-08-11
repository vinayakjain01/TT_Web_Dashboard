import Papa from "papaparse";

/** Parses raw CSV text into rows of raw string cells - no header interpretation here. */
export function parseCsvRows(csvText: string): string[][] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });
  return result.data.filter((row): row is string[] => Array.isArray(row) && row.length > 0);
}
