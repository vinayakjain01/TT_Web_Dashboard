export interface ParsedLead {
  sourceRowIndex: number;
  dateRaw: string;
  date: string | null; // ISO yyyy-mm-dd
  customerName: string;
  source: string;
  country: string;
  phoneRaw: string;
  phoneKey: string | null;
  followUpDateRaw: string;
  followUpDate: string | null;
  status: string;
  isConverted: boolean;
  isStoreAppointment: boolean;
  potentialOrderAmount: number | null;
  saleAmount: number | null;
  paymentMode: string;
  leadAddedBy: string;
  leadConvertedBy: string;
  notesReasonForRefusal: string;
  brand: string;
  salesTarget: string;
  city: string;
  productCategory: string;
  isTestRecord: boolean;
}

export type DateReviewReason =
  | "unparseable_raw_value"
  | "no_month_component"
  | "date_range_or_relative"
  | "booking_after_visit_both_years"
  | "visit_year_explicit_inconsistent";

export type DatePrecision = "exact" | "approximate";

export interface ParsedStoreAppointment {
  tabGid: string;
  tabTitle: string;
  sourceRowIndex: number;
  slNoRaw: string;
  name: string;
  dateOfBookingRaw: string;
  dateOfBooking: string | null;
  dateOfVisitRaw: string;
  dateOfVisit: string | null;
  /** Full original range text ("Jan 10-13th 2025") when dateOfVisit came from a date
   * range - the range isn't lost, it's just not what date arithmetic uses. */
  visitDateNote: string | null;
  /** "approximate" when dateOfVisit was defaulted from a vague, no-specific-day value
   * like "March 1st week" - never rendered identically to a confirmed date. */
  visitDatePrecision: DatePrecision;
  dateNeedsReview: boolean;
  dateReviewReason: DateReviewReason | null;
  storeLocationRaw: string;
  city: string;
  locationNeedsReview: boolean;
  contactRaw: string;
  primaryPhoneRaw: string | null;
  primaryPhoneKey: string | null;
  secondaryPhoneRaw: string | null;
  secondaryPhoneKey: string | null;
  followUpOutcomeRaw: string;
  visitOutcome: VisitOutcome;
  visitedFlagRaw: string;
  orderPlacedFlagRaw: string;
  notes: string;
  productDetail: string;
  priceDetails: string;
  styleDetails: string;
  clientReviews: string;
}

export type VisitOutcome =
  | "Purchased"
  | "Visited, No Purchase"
  | "Not Reached / No Visit"
  | "Pending / Rescheduled"
  | "Other / Uncategorized";

export interface TabConfig {
  gid: string;
  title: string;
  year: number;
  monthIndex: number; // 0-11
}
