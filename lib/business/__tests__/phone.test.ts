import { describe, expect, it } from "vitest";
import { splitPhoneCell, toPhoneKey } from "../phone";

describe("splitPhoneCell (rule 3)", () => {
  it("splits the known multi-number format into two distinct phone values, not one malformed string", () => {
    const result = splitPhoneCell("9110655117 /1 (201) 993-3234");
    expect(result.primaryRaw).toBe("9110655117");
    expect(result.secondaryRaw).toBe("1 (201) 993-3234");
    expect(result.primaryKey).toBe("9110655117");
    expect(result.secondaryKey).toBe("2019933234");
    expect(result.primaryKey).not.toBe(result.secondaryKey);
  });

  it("leaves a single-number cell as primary only", () => {
    const result = splitPhoneCell("96503 72359");
    expect(result.primaryKey).toBe("9650372359");
    expect(result.secondaryRaw).toBeNull();
  });

  it("normalizes country-code variants to the same last-10-digit key", () => {
    expect(toPhoneKey("91 98332 80707")).toBe(toPhoneKey("98332 80707"));
  });
});
