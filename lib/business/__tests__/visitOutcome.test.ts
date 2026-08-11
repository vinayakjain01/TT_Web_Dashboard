import { describe, expect, it } from "vitest";
import { classifyVisitOutcome } from "../visitOutcome";

describe("classifyVisitOutcome (rule 5)", () => {
  it('classifies "Purchased" as Purchased', () => {
    expect(classifyVisitOutcome("Purchased")).toBe("Purchased");
  });

  it('does NOT misclassify negated purchase phrases as Purchased (real rows from the sheet)', () => {
    // A literal "contains 'purchas'" rule would wrongly tag these as Purchased since
    // both phrases contain that substring - they mean the opposite.
    expect(classifyVisitOutcome("Visted, did not Purchase")).toBe("Visited, No Purchase");
    expect(classifyVisitOutcome("Visted, did not like and Purchase")).toBe("Visited, No Purchase");
    expect(classifyVisitOutcome("Did not purchase at store")).toBe("Visited, No Purchase");
  });

  it("classifies plain visited-without-purchase phrasing correctly", () => {
    expect(classifyVisitOutcome("Client has visited the store")).toBe("Visited, No Purchase");
  });

  it("classifies not-reached phrasing", () => {
    expect(classifyVisitOutcome("D called, no answer, 19 Jan, 20 Jan")).toBe("Not Reached / No Visit");
    expect(classifyVisitOutcome("Cannot visit the store")).toBe("Not Reached / No Visit");
    expect(classifyVisitOutcome("Did not visit and left Delhi")).toBe("Not Reached / No Visit");
  });

  it("classifies pending/rescheduled phrasing", () => {
    expect(classifyVisitOutcome("Client would be visiting the store")).toBe("Pending / Rescheduled");
    expect(classifyVisitOutcome("will visit later")).toBe("Pending / Rescheduled");
  });

  it("falls back to Other/Uncategorized for unmatched narrative text", () => {
    expect(classifyVisitOutcome("IMP")).toBe("Other / Uncategorized");
    expect(classifyVisitOutcome("Couture related")).toBe("Other / Uncategorized");
    expect(classifyVisitOutcome("")).toBe("Other / Uncategorized");
  });
});
