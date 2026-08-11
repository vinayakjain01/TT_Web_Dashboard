import { cell, isRowBlank, resolveAllColumnIndices, resolveColumnIndex } from "./columns";
import { resolveBookingDate, resolveVisitDate } from "./dates";
import { resolveCity } from "./location";
import { splitPhoneCell } from "./phone";
import type { ParsedStoreAppointment, TabConfig } from "./types";
import { classifyVisitOutcome } from "./visitOutcome";

/**
 * Parses one data row from a Store Appointments tab. Column roles are resolved by
 * header name against THIS tab's own header row (never a fixed position) except for
 * the SL. No / index column, whose header text is unreliable garbage on at least one
 * tab (a stray person's name) - it's decorative only, so it's read positionally.
 */
export function parseAppointmentRow(
  tabConfig: TabConfig,
  outcomeColumnLabels: string[],
  headerRow: string[],
  dataRow: string[],
  rowIndexInTab: number
): ParsedStoreAppointment | null {
  if (isRowBlank(dataRow)) return null;

  const idx = {
    dateOfBooking: resolveColumnIndex(headerRow, "Date of Booking"),
    name: resolveColumnIndex(headerRow, "Name"),
    dateOfVisit: resolveColumnIndex(headerRow, "Date of visit"),
    storeLocation: resolveColumnIndex(headerRow, "Store location"),
    contact: resolveColumnIndex(headerRow, "Contact details"),
    productDetail: resolveColumnIndex(headerRow, "Product detail"),
    priceDetails: resolveColumnIndex(headerRow, "Price details"),
    visited: resolveColumnIndex(headerRow, "Visited (Yes/no)"),
    orderPlaced: resolveColumnIndex(headerRow, "Order placed (yes/no)"),
    clientReviews: resolveColumnIndex(headerRow, "Client Reviews by store"),
    styleDetails: resolveColumnIndex(headerRow, "Style details"),
  };

  const slNoRaw = cell(dataRow, 0);
  const name = cell(dataRow, idx.name);
  const dateOfBookingRaw = cell(dataRow, idx.dateOfBooking);
  const dateOfVisitRaw = cell(dataRow, idx.dateOfVisit);
  const storeLocationRaw = cell(dataRow, idx.storeLocation);
  const contactRaw = cell(dataRow, idx.contact);

  // Section-divider rows ("1st Week 1 December - 7 December 2025") show up inside
  // Store Appointments tabs too, not just the lead sheet - the marker text can land in
  // any column depending on the tab's layout, but a real appointment always has a name
  // and/or one of the two dates. Skip rows with none of the three, whatever else they contain.
  if (!name && !dateOfBookingRaw && !dateOfVisitRaw) return null;

  const visitRes = resolveVisitDate(dateOfVisitRaw, tabConfig.year, tabConfig.monthIndex);
  const bookingRes = resolveBookingDate(
    dateOfBookingRaw,
    tabConfig.year,
    tabConfig.monthIndex,
    visitRes.iso,
    visitRes.yearWasExplicit
  );
  const dateNeedsReview = visitRes.needsReview || bookingRes.needsReview;
  const dateReviewReason = bookingRes.needsReview ? bookingRes.reason : visitRes.reason;

  const { city, needsReview: locationNeedsReview } = resolveCity(storeLocationRaw);
  const phones = splitPhoneCell(contactRaw);

  const outcomeText = outcomeColumnLabels
    .map((label) => cell(dataRow, resolveColumnIndex(headerRow, label)))
    .filter(Boolean)
    .join(" | ");

  const notesIndices = resolveAllColumnIndices(headerRow, "Notes");
  const notes = notesIndices
    .map((i) => cell(dataRow, i))
    .filter(Boolean)
    .join(" | ");

  return {
    tabGid: tabConfig.gid,
    tabTitle: tabConfig.title,
    sourceRowIndex: rowIndexInTab,
    slNoRaw,
    name,
    dateOfBookingRaw,
    dateOfBooking: bookingRes.iso,
    dateOfVisitRaw,
    dateOfVisit: visitRes.iso,
    visitDateNote: visitRes.visitDateNote,
    visitDatePrecision: visitRes.precision,
    dateNeedsReview,
    dateReviewReason,
    storeLocationRaw,
    city,
    locationNeedsReview,
    contactRaw,
    primaryPhoneRaw: phones.primaryRaw,
    primaryPhoneKey: phones.primaryKey,
    secondaryPhoneRaw: phones.secondaryRaw,
    secondaryPhoneKey: phones.secondaryKey,
    followUpOutcomeRaw: outcomeText,
    visitOutcome: classifyVisitOutcome(outcomeText),
    visitedFlagRaw: cell(dataRow, idx.visited),
    orderPlacedFlagRaw: cell(dataRow, idx.orderPlaced),
    notes,
    productDetail: cell(dataRow, idx.productDetail),
    priceDetails: cell(dataRow, idx.priceDetails),
    styleDetails: cell(dataRow, idx.styleDetails),
    clientReviews: cell(dataRow, idx.clientReviews),
  };
}
