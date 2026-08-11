import { parseCsvRows } from "@/lib/business/csv";

/**
 * Fetches one tab's data via Google Sheets' public CSV export. Both source
 * spreadsheets are shared "anyone with the link can view," confirmed by direct fetch -
 * no service-account credentials are wired up for this project (see README). If sharing
 * settings ever change, this starts failing loudly (non-2xx / redirect-to-login HTML)
 * rather than silently returning stale data.
 */
export async function fetchSheetTabCsv(spreadsheetId: string, gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet ${spreadsheetId} gid=${gid}: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (text.trimStart().startsWith("<HTML") || text.trimStart().startsWith("<!DOCTYPE")) {
    throw new Error(
      `Sheet ${spreadsheetId} gid=${gid} did not return CSV (got an HTML page - sharing settings may have changed).`
    );
  }
  return parseCsvRows(text);
}
