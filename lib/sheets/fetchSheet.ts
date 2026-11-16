import { parseCsvRows } from "@/lib/business/csv";
import { getServiceAccountToken, hasServiceAccount } from "@/lib/sheets/googleAuth";

/**
 * Fetches one tab's data via Google Sheets' public CSV export. Both source
 * spreadsheets are shared "anyone with the link can view," confirmed by direct fetch -
 * no service-account credentials are wired up for this project (see README). If sharing
 * settings ever change, this starts failing loudly (non-2xx / redirect-to-login HTML)
 * rather than silently returning stale data.
 */
export async function fetchSheetTabCsv(spreadsheetId: string, gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  // Public sheets need no credentials. If a sheet has been restricted (401/403, or a
  // login HTML page) and a service account is configured, retry as that account - the
  // sheet just has to be shared with the service account's email.
  let res = await fetch(url, { redirect: "follow" });
  let text = res.ok ? await res.text() : "";
  const looksLikeHtml = (t: string) => /^\s*<(!doctype|html)/i.test(t);
  if ((!res.ok || looksLikeHtml(text)) && hasServiceAccount()) {
    const token = await getServiceAccountToken();
    res = await fetch(url, { redirect: "follow", headers: { Authorization: `Bearer ${token}` } });
    text = res.ok ? await res.text() : "";
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch sheet ${spreadsheetId} gid=${gid}: HTTP ${res.status}` +
        (hasServiceAccount() ? " (even with the service account - is the sheet shared with it?)" : " (sheet is restricted and GOOGLE_SERVICE_ACCOUNT_JSON is not set)")
    );
  }
  if (looksLikeHtml(text)) {
    throw new Error(`Sheet ${spreadsheetId} gid=${gid} did not return CSV (got an HTML page - sharing settings may have changed).`);
  }
  return parseCsvRows(text);
}
