import "dotenv/config";
import postgres from "postgres";
import { fetchParsedAppointments, fetchParsedLeads } from "@/lib/dataSource";
import { matchLeadsToAppointments } from "@/lib/business/match";
import type { ParsedLead, ParsedStoreAppointment } from "@/lib/business/types";
import { appointmentToDbColumns, leadToDbColumns } from "@/lib/types/mapping";

const BATCH_SIZE = 500;
const isDryRun = process.argv.includes("--dry-run");

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

const LEAD_COLUMNS = Object.keys(leadToDbColumns({} as ParsedLead)) as (keyof ReturnType<typeof leadToDbColumns>)[];
const APPOINTMENT_COLUMNS = Object.keys(
  appointmentToDbColumns({} as ParsedStoreAppointment)
) as (keyof ReturnType<typeof appointmentToDbColumns>)[];

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
  const leads = await fetchParsedLeads();

  console.log("Fetching store appointment tabs...");
  const appointments = await fetchParsedAppointments();

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

      for (const batch of chunk(leads.map(leadToDbColumns), BATCH_SIZE)) {
        await tx`insert into leads ${tx(batch, ...LEAD_COLUMNS)}`;
      }
      for (const batch of chunk(appointments.map(appointmentToDbColumns), BATCH_SIZE)) {
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
