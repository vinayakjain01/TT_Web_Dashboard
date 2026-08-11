import "dotenv/config";
import postgres from "postgres";
import { OUTCOME_SOURCE_COLUMNS, SHEET2_TABS } from "@/config/sheet2Tabs";
import { parseAppointmentRow } from "@/lib/business/appointmentParser";
import { parseLeadRow } from "@/lib/business/leadParser";
import { matchLeadsToAppointments } from "@/lib/business/match";
import type { ParsedLead, ParsedStoreAppointment } from "@/lib/business/types";
import { fetchSheetTabCsv } from "@/lib/sheets/fetchSheet";

const LEAD_SPREADSHEET_ID = "1NvXaOurTqKPYpndiIhCfszfB8V_U0iRhhVVa5aBhXgQ";
const LEAD_TAB_GID = "1816174605";
const APPOINTMENT_SPREADSHEET_ID = "1Kb7qHzaRTc8KTwqsb8g3GUFtKNd9rbkXV8FsFBAl2rI";

const BATCH_SIZE = 500;
const isDryRun = process.argv.includes("--dry-run");

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function fetchLeads(): Promise<ParsedLead[]> {
  const rows = await fetchSheetTabCsv(LEAD_SPREADSHEET_ID, LEAD_TAB_GID);
  const dataRows = rows.slice(1);
  const leads: ParsedLead[] = [];
  dataRows.forEach((row, i) => {
    const parsed = parseLeadRow(row, i + 1);
    if (parsed) leads.push(parsed);
  });
  return leads;
}

async function fetchAppointments(): Promise<ParsedStoreAppointment[]> {
  const appointments: ParsedStoreAppointment[] = [];
  for (const tabConfig of SHEET2_TABS) {
    const rows = await fetchSheetTabCsv(APPOINTMENT_SPREADSHEET_ID, tabConfig.gid);
    if (rows.length === 0) {
      console.warn(`  ${tabConfig.title} (gid=${tabConfig.gid}): no rows returned - skipping.`);
      continue;
    }
    const [headerRow, ...dataRows] = rows;
    const outcomeColumns = OUTCOME_SOURCE_COLUMNS[tabConfig.gid];
    if (!outcomeColumns) {
      throw new Error(
        `No OUTCOME_SOURCE_COLUMNS entry for gid=${tabConfig.gid} (${tabConfig.title}). ` +
          `Inspect this tab's real data (not just its headers - see config/sheet2Tabs.ts) before adding one.`
      );
    }
    let parsedCount = 0;
    dataRows.forEach((row, i) => {
      const parsed = parseAppointmentRow(tabConfig, outcomeColumns, headerRow, row, i + 1);
      if (parsed) {
        appointments.push(parsed);
        parsedCount++;
      }
    });
    console.log(`  ${tabConfig.title} (gid=${tabConfig.gid}): ${parsedCount} appointment rows.`);
  }
  return appointments;
}

function leadToRow(lead: ParsedLead) {
  return {
    source_row_index: lead.sourceRowIndex,
    date: lead.date,
    date_raw: lead.dateRaw,
    customer_name: lead.customerName,
    source: lead.source,
    country: lead.country,
    phone_raw: lead.phoneRaw,
    phone_key: lead.phoneKey,
    follow_up_date: lead.followUpDate,
    follow_up_date_raw: lead.followUpDateRaw,
    status: lead.status,
    is_converted: lead.isConverted,
    is_store_appointment: lead.isStoreAppointment,
    potential_order_amount: lead.potentialOrderAmount,
    sale_amount: lead.saleAmount,
    payment_mode: lead.paymentMode,
    lead_added_by: lead.leadAddedBy,
    lead_converted_by: lead.leadConvertedBy,
    notes_reason_for_refusal: lead.notesReasonForRefusal,
    brand: lead.brand,
    sales_target: lead.salesTarget,
    city: lead.city,
    product_category: lead.productCategory,
    is_test_record: lead.isTestRecord,
  };
}

const LEAD_COLUMNS = Object.keys(leadToRow({} as ParsedLead)) as (keyof ReturnType<typeof leadToRow>)[];

function appointmentToRow(appt: ParsedStoreAppointment) {
  return {
    tab_gid: appt.tabGid,
    tab_title: appt.tabTitle,
    source_row_index: appt.sourceRowIndex,
    sl_no_raw: appt.slNoRaw,
    name: appt.name,
    date_of_booking: appt.dateOfBooking,
    date_of_booking_raw: appt.dateOfBookingRaw,
    date_of_visit: appt.dateOfVisit,
    date_of_visit_raw: appt.dateOfVisitRaw,
    date_needs_review: appt.dateNeedsReview,
    date_review_reason: appt.dateReviewReason,
    store_location_raw: appt.storeLocationRaw,
    city: appt.city,
    location_needs_review: appt.locationNeedsReview,
    contact_raw: appt.contactRaw,
    primary_phone_raw: appt.primaryPhoneRaw,
    primary_phone_key: appt.primaryPhoneKey,
    secondary_phone_raw: appt.secondaryPhoneRaw,
    secondary_phone_key: appt.secondaryPhoneKey,
    follow_up_outcome_raw: appt.followUpOutcomeRaw,
    visit_outcome: appt.visitOutcome,
    visited_flag_raw: appt.visitedFlagRaw,
    order_placed_flag_raw: appt.orderPlacedFlagRaw,
    notes: appt.notes,
    product_detail: appt.productDetail,
    price_details: appt.priceDetails,
    style_details: appt.styleDetails,
    client_reviews: appt.clientReviews,
  };
}

const APPOINTMENT_COLUMNS = Object.keys(
  appointmentToRow({} as ParsedStoreAppointment)
) as (keyof ReturnType<typeof appointmentToRow>)[];

function printSummary(leads: ParsedLead[], appointments: ParsedStoreAppointment[], matchCount: number) {
  const testRecords = leads.filter((l) => l.isTestRecord).length;
  const realLeads = leads.length - testRecords;
  const converted = leads.filter((l) => !l.isTestRecord && l.isConverted).length;
  const dateReview = appointments.filter((a) => a.dateNeedsReview).length;
  const locationReview = appointments.filter((a) => a.locationNeedsReview).length;

  console.log("\n--- Sync summary ---");
  console.log(`Leads parsed:            ${leads.length} (${testRecords} test records, ${realLeads} real)`);
  console.log(`Real conversion rate:    ${realLeads ? ((converted / realLeads) * 100).toFixed(1) : "0.0"}%`);
  console.log(`Store appointments:      ${appointments.length}`);
  console.log(`  -> date_needs_review:     ${dateReview}`);
  console.log(`  -> location_needs_review: ${locationReview}`);
  console.log(`Lead<->appointment matches: ${matchCount}`);
}

async function main() {
  console.log("Fetching lead funnel sheet...");
  const leads = await fetchLeads();

  console.log("Fetching store appointment tabs...");
  const appointments = await fetchAppointments();

  const matches = matchLeadsToAppointments(leads, appointments);
  printSummary(leads, appointments, matches.length);

  if (isDryRun) {
    console.log("\nDry run - no database writes performed.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (dev) or GitHub Actions secrets (CI).");
  }

  const sql = postgres(databaseUrl, { ssl: "require" });
  try {
    await sql.begin(async (tx) => {
      await tx`truncate table lead_appointment_matches, store_appointments, leads`;

      for (const batch of chunk(leads.map(leadToRow), BATCH_SIZE)) {
        await tx`insert into leads ${tx(batch, ...LEAD_COLUMNS)}`;
      }
      for (const batch of chunk(appointments.map(appointmentToRow), BATCH_SIZE)) {
        await tx`insert into store_appointments ${tx(batch, ...APPOINTMENT_COLUMNS)}`;
      }
      const matchRows = matches.map((m) => ({
        lead_source_row_index: m.leadSourceRowIndex,
        appointment_tab_gid: m.appointmentTabGid,
        appointment_source_row_index: m.appointmentSourceRowIndex,
        match_basis: m.matchBasis,
      }));
      for (const batch of chunk(matchRows, BATCH_SIZE)) {
        await tx`insert into lead_appointment_matches ${tx(
          batch,
          "lead_source_row_index",
          "appointment_tab_gid",
          "appointment_source_row_index",
          "match_basis"
        )}`;
      }
    });
    console.log("\nDatabase sync complete.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
