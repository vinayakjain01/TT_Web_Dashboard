import { describe, expect, it } from "vitest";
import { resolveCity } from "../location";

describe("resolveCity (rule 4)", () => {
  it.each(["Mehrauli", "mehrauli", "Mehurali", "Meharuli", "New Delhi", "Delhi", "DELHI"])(
    "%s rolls up to Delhi",
    (raw) => {
      const result = resolveCity(raw);
      expect(result.city).toBe("Delhi");
      expect(result.needsReview).toBe(false);
    }
  );

  it.each(["Juhu", "JUHU", "juhu", "Mumbai", "mumbai", "Fort", "Colaba", "Kala Ghoda"])(
    "%s rolls up to Mumbai",
    (raw) => {
      const result = resolveCity(raw);
      expect(result.city).toBe("Mumbai");
      expect(result.needsReview).toBe(false);
    }
  );

  it("flags Ballard for manual review instead of silently bucketing it into an existing city", () => {
    const result = resolveCity("Ballard");
    expect(result.needsReview).toBe(true);
    expect(result.city).toBe("Ballard");
  });

  it("flags Ballard Estate for manual review too", () => {
    const result = resolveCity("Ballard Estate");
    expect(result.needsReview).toBe(true);
  });

  it("passes through an unrecognized location as its own bucket and flags it, without dropping it", () => {
    const result = resolveCity("Somewhere New");
    expect(result.city).toBe("Somewhere New");
    expect(result.needsReview).toBe(true);
  });
});
