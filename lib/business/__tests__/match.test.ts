import { describe, expect, it } from "vitest";
import { matchLeadsToAppointments } from "../match";
import type { ParsedLead, ParsedStoreAppointment } from "../types";

function lead(overrides: Partial<ParsedLead>): ParsedLead {
  return {
    sourceRowIndex: 1, dateRaw: "", date: null, customerName: "", source: "", country: "",
    phoneRaw: "", phoneKey: null, followUpDateRaw: "", followUpDate: null, status: "",
    isConverted: false, isStoreAppointment: false, potentialOrderAmount: null, saleAmount: null,
    paymentMode: "", leadAddedBy: "", leadConvertedBy: "", notesReasonForRefusal: "", brand: "",
    salesTarget: "", city: "", productCategory: "", isTestRecord: false, ...overrides,
  };
}

function appt(overrides: Partial<ParsedStoreAppointment>): ParsedStoreAppointment {
  return {
    tabGid: "g", tabTitle: "t", sourceRowIndex: 1, slNoRaw: "", name: "",
    dateOfBookingRaw: "", dateOfBooking: null, dateOfVisitRaw: "", dateOfVisit: null,
    visitDateNote: null, visitDatePrecision: "exact",
    dateNeedsReview: false, dateReviewReason: null, storeLocationRaw: "", city: "",
    locationNeedsReview: false, contactRaw: "", primaryPhoneRaw: null, primaryPhoneKey: null,
    secondaryPhoneRaw: null, secondaryPhoneKey: null, followUpOutcomeRaw: "",
    visitOutcome: "Other / Uncategorized", visitedFlagRaw: "", orderPlacedFlagRaw: "",
    notes: "", productDetail: "", priceDetails: "", styleDetails: "", clientReviews: "",
    ...overrides,
  };
}

describe("matchLeadsToAppointments (rule 6)", () => {
  it("matches on phone_key as the primary signal", () => {
    const leads = [lead({ sourceRowIndex: 1, customerName: "Priya", phoneKey: "9876543210" })];
    const appointments = [appt({ tabGid: "g1", sourceRowIndex: 1, name: "Priya M", primaryPhoneKey: "9876543210" })];
    const matches = matchLeadsToAppointments(leads, appointments);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchBasis).toBe("phone");
  });

  it("falls back to a close name match when phone doesn't match", () => {
    const leads = [lead({ sourceRowIndex: 2, customerName: "Rashim Gandhi", phoneKey: null })];
    const appointments = [appt({ tabGid: "g1", sourceRowIndex: 2, name: "Rashim Gandi", primaryPhoneKey: "1112223333" })];
    const matches = matchLeadsToAppointments(leads, appointments);
    expect(matches).toHaveLength(1);
    expect(matches[0].matchBasis).toBe("name");
  });

  it("leaves unrelated records unmatched without dropping them", () => {
    const leads = [lead({ sourceRowIndex: 3, customerName: "Totally Unrelated", phoneKey: "1111111111" })];
    const appointments = [appt({ tabGid: "g1", sourceRowIndex: 3, name: "Someone Else", primaryPhoneKey: "2222222222" })];
    const matches = matchLeadsToAppointments(leads, appointments);
    expect(matches).toHaveLength(0);
  });
});
