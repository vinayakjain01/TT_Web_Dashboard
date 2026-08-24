import type { ParsedLead, ParsedStoreAppointment } from "@/lib/business/types";
import type { LeadAppointmentMatch } from "@/lib/business/match";
import type { LeadJourneyRow, LeadRow, StoreAppointmentRow } from "./db";

// Shared between scripts/sync.ts (DB column names for insert) and the API routes'
// no-Supabase-configured fallback (full Row shape for direct dashboard consumption).

export function leadToDbColumns(l: ParsedLead) {
  return {
    tab_gid: l.tabGid,
    tab_title: l.tabTitle,
    source_row_index: l.sourceRowIndex,
    date: l.date,
    date_raw: l.dateRaw,
    customer_name: l.customerName,
    source: l.source,
    country: l.country,
    phone_raw: l.phoneRaw,
    phone_key: l.phoneKey,
    follow_up_date: l.followUpDate,
    follow_up_date_raw: l.followUpDateRaw,
    status: l.status,
    is_converted: l.isConverted,
    is_store_appointment: l.isStoreAppointment,
    potential_order_amount: l.potentialOrderAmount,
    sale_amount: l.saleAmount,
    payment_mode: l.paymentMode,
    lead_added_by: l.leadAddedBy,
    lead_converted_by: l.leadConvertedBy,
    notes_reason_for_refusal: l.notesReasonForRefusal,
    brand: l.brand,
    sales_target: l.salesTarget,
    city: l.city,
    product_category: l.productCategory,
    is_test_record: l.isTestRecord,
  };
}

export function leadToRow(l: ParsedLead, id: number, syncedAt: string): LeadRow {
  return { id, synced_at: syncedAt, ...leadToDbColumns(l) };
}

export function appointmentToDbColumns(a: ParsedStoreAppointment) {
  return {
    tab_gid: a.tabGid,
    tab_title: a.tabTitle,
    source_row_index: a.sourceRowIndex,
    sl_no_raw: a.slNoRaw,
    name: a.name,
    date_of_booking: a.dateOfBooking,
    date_of_booking_raw: a.dateOfBookingRaw,
    date_of_visit: a.dateOfVisit,
    date_of_visit_raw: a.dateOfVisitRaw,
    visit_date_note: a.visitDateNote,
    visit_date_precision: a.visitDatePrecision,
    date_needs_review: a.dateNeedsReview,
    date_review_reason: a.dateReviewReason,
    store_location_raw: a.storeLocationRaw,
    city: a.city,
    location_needs_review: a.locationNeedsReview,
    contact_raw: a.contactRaw,
    primary_phone_raw: a.primaryPhoneRaw,
    primary_phone_key: a.primaryPhoneKey,
    secondary_phone_raw: a.secondaryPhoneRaw,
    secondary_phone_key: a.secondaryPhoneKey,
    follow_up_outcome_raw: a.followUpOutcomeRaw,
    visit_outcome: a.visitOutcome,
    visited_flag_raw: a.visitedFlagRaw,
    order_placed_flag_raw: a.orderPlacedFlagRaw,
    notes: a.notes,
    product_detail: a.productDetail,
    price_details: a.priceDetails,
    style_details: a.styleDetails,
    client_reviews: a.clientReviews,
  };
}

export function appointmentToRow(a: ParsedStoreAppointment, id: number, syncedAt: string): StoreAppointmentRow {
  return { id, synced_at: syncedAt, ...appointmentToDbColumns(a) };
}

export function matchToJourneyRow(
  m: LeadAppointmentMatch,
  lead: ParsedLead,
  appointment: ParsedStoreAppointment
): LeadJourneyRow {
  return {
    lead_source_row_index: lead.sourceRowIndex,
    customer_name: lead.customerName,
    lead_source: lead.source,
    lead_date: lead.date,
    lead_status: lead.status,
    country: lead.country,
    match_basis: m.matchBasis,
    appointment_tab_gid: appointment.tabGid,
    appointment_tab_title: appointment.tabTitle,
    date_of_booking: appointment.dateOfBooking,
    date_of_visit: appointment.dateOfVisit,
    appointment_city: appointment.city,
    visit_outcome: appointment.visitOutcome,
  };
}
