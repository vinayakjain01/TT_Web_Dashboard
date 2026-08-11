// Mirrors supabase/migrations/0001_init.sql exactly - snake_case, as returned by
// PostgREST. Dashboard components consume these directly rather than re-mapping to
// camelCase; lib/business/* types are for the sync pipeline, not the read path.

export interface LeadRow {
  id: number;
  source_row_index: number;
  date: string | null;
  date_raw: string;
  customer_name: string;
  source: string;
  country: string;
  phone_raw: string;
  phone_key: string | null;
  follow_up_date: string | null;
  follow_up_date_raw: string;
  status: string;
  is_converted: boolean;
  is_store_appointment: boolean;
  potential_order_amount: number | null;
  sale_amount: number | null;
  payment_mode: string;
  lead_added_by: string;
  lead_converted_by: string;
  notes_reason_for_refusal: string;
  brand: string;
  sales_target: string;
  city: string;
  product_category: string;
  is_test_record: boolean;
  synced_at: string;
}

export interface StoreAppointmentRow {
  id: number;
  tab_gid: string;
  tab_title: string;
  source_row_index: number;
  sl_no_raw: string;
  name: string;
  date_of_booking: string | null;
  date_of_booking_raw: string;
  date_of_visit: string | null;
  date_of_visit_raw: string;
  visit_date_note: string | null;
  visit_date_precision: "exact" | "approximate";
  date_needs_review: boolean;
  date_review_reason: string | null;
  store_location_raw: string;
  city: string;
  location_needs_review: boolean;
  contact_raw: string;
  primary_phone_raw: string | null;
  primary_phone_key: string | null;
  secondary_phone_raw: string | null;
  secondary_phone_key: string | null;
  follow_up_outcome_raw: string;
  visit_outcome: string;
  visited_flag_raw: string;
  order_placed_flag_raw: string;
  notes: string;
  product_detail: string;
  price_details: string;
  style_details: string;
  client_reviews: string;
  synced_at: string;
}

export interface LeadJourneyRow {
  lead_source_row_index: number;
  customer_name: string;
  lead_source: string;
  lead_date: string | null;
  lead_status: string;
  country: string;
  match_basis: "phone" | "name";
  appointment_tab_gid: string;
  appointment_tab_title: string;
  date_of_booking: string | null;
  date_of_visit: string | null;
  appointment_city: string;
  visit_outcome: string;
}
