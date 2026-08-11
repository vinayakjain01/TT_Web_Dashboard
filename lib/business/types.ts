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
  | "booking_after_visit_both_years";

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
