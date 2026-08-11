import { describe, expect, it } from "vitest";
import { outcomeColumnsResolve, resolveColumnIndex } from "../columns";

describe("resolveColumnIndex", () => {
  it("finds a column by trimmed, case-insensitive name", () => {
    expect(resolveColumnIndex(["Name ", "Date of visit"], "date of visit")).toBe(1);
  });

  it("resolves the Nth occurrence via a '.N' suffix, matching duplicate headers", () => {
    const header = ["SL. No", "Notes", "Price", "Notes"];
    expect(resolveColumnIndex(header, "Notes")).toBe(1);
    expect(resolveColumnIndex(header, "Notes.1")).toBe(3);
  });

  it("returns null when the column doesn't exist", () => {
    expect(resolveColumnIndex(["Name"], "Follow up Date")).toBeNull();
  });
});

describe("outcomeColumnsResolve", () => {
  it("is true when at least one configured label exists in the header", () => {
    expect(outcomeColumnsResolve(["Name", "Notes"], ["Notes", "Notes.1"])).toBe(true);
  });

  it("is false when the sheet's columns have drifted and none resolve anymore", () => {
    // Regression case: JAN 2026's "Follow up Date" column was live-renamed to "Notes"
    // after this project's config was first written - this must be caught, not
    // silently swallowed into every row reading "Other / Uncategorized".
    const renamedHeader = ["SL. No", "Date of Booking", "Name", "Notes"];
    expect(outcomeColumnsResolve(renamedHeader, ["Follow up Date"])).toBe(false);
  });
});
