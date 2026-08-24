import type { ParsedLead, ParsedStoreAppointment } from "./types";

export interface LeadAppointmentMatch {
  leadTabGid: string;
  leadSourceRowIndex: number;
  appointmentTabGid: string;
  appointmentSourceRowIndex: number;
  matchBasis: "phone" | "name";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function namesAreClose(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return levenshtein(na, nb) <= 2;
}

/**
 * Rule 6: a soft, best-effort join keyed on normalized phone (strong signal), falling
 * back to a close name match only for records a phone match didn't already resolve.
 * Every lead and every appointment stays visible in its own section regardless of
 * whether a match is found - this only powers the additional cross-linked journey view.
 */
export function matchLeadsToAppointments(
  leads: ParsedLead[],
  appointments: ParsedStoreAppointment[]
): LeadAppointmentMatch[] {
  const matches: LeadAppointmentMatch[] = [];
  // Keyed by "tabGid:sourceRowIndex" - sourceRowIndex resets per lead tab (same as
  // appointments), so the tab must be part of a lead's identity here too.
  const matchedLeadRows = new Set<string>();
  const matchedAppointmentKeys = new Set<string>();
  const leadKey = (l: ParsedLead) => `${l.tabGid}:${l.sourceRowIndex}`;

  const appointmentsByPhone = new Map<string, ParsedStoreAppointment[]>();
  for (const appt of appointments) {
    for (const key of [appt.primaryPhoneKey, appt.secondaryPhoneKey]) {
      if (!key) continue;
      const list = appointmentsByPhone.get(key) ?? [];
      list.push(appt);
      appointmentsByPhone.set(key, list);
    }
  }

  for (const lead of leads) {
    if (!lead.phoneKey) continue;
    const candidates = appointmentsByPhone.get(lead.phoneKey);
    if (!candidates || candidates.length === 0) continue;
    const appt = candidates[0];
    matches.push({
      leadTabGid: lead.tabGid,
      leadSourceRowIndex: lead.sourceRowIndex,
      appointmentTabGid: appt.tabGid,
      appointmentSourceRowIndex: appt.sourceRowIndex,
      matchBasis: "phone",
    });
    matchedLeadRows.add(leadKey(lead));
    matchedAppointmentKeys.add(`${appt.tabGid}:${appt.sourceRowIndex}`);
  }

  const unmatchedLeads = leads.filter((l) => !matchedLeadRows.has(leadKey(l)) && l.customerName);
  const unmatchedAppointments = appointments.filter(
    (a) => !matchedAppointmentKeys.has(`${a.tabGid}:${a.sourceRowIndex}`) && a.name
  );

  for (const lead of unmatchedLeads) {
    const appt = unmatchedAppointments.find(
      (a) =>
        !matchedAppointmentKeys.has(`${a.tabGid}:${a.sourceRowIndex}`) &&
        namesAreClose(lead.customerName, a.name)
    );
    if (!appt) continue;
    matches.push({
      leadTabGid: lead.tabGid,
      leadSourceRowIndex: lead.sourceRowIndex,
      appointmentTabGid: appt.tabGid,
      appointmentSourceRowIndex: appt.sourceRowIndex,
      matchBasis: "name",
    });
    matchedAppointmentKeys.add(`${appt.tabGid}:${appt.sourceRowIndex}`);
  }

  return matches;
}
