export interface SplitPhone {
  primaryRaw: string | null;
  primaryKey: string | null;
  secondaryRaw: string | null;
  secondaryKey: string | null;
}

/** Last-10-digits key sidesteps inconsistent country-code prefixes (e.g. "91" on Indian numbers). */
export function toPhoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Splits a contact cell that may hold two phone numbers separated by "/"
 * (e.g. "9110655117 /1 (201) 993-3234"), normalizing each to a phone_key
 * while preserving the original raw text for both.
 */
export function splitPhoneCell(raw: string): SplitPhone {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { primaryRaw: null, primaryKey: null, secondaryRaw: null, secondaryKey: null };
  }
  const parts = trimmed.split("/").map((p) => p.trim()).filter(Boolean);
  const primaryRaw = parts[0] ?? null;
  const secondaryRaw = parts[1] ?? null;
  return {
    primaryRaw,
    primaryKey: primaryRaw ? toPhoneKey(primaryRaw) : null,
    secondaryRaw,
    secondaryKey: secondaryRaw ? toPhoneKey(secondaryRaw) : null,
  };
}
