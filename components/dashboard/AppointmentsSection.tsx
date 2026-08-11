"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { APPOINTMENT_FILTER_KEYS } from "@/lib/filters/appointmentFilters";
import { useFetchJson } from "@/lib/hooks/useFetchJson";
import type { StoreAppointmentRow } from "@/lib/types/db";
import { BarChartCard, CHART_PALETTE } from "./BarChartCard";
import { DateField } from "./DateField";
import { FilterSelect } from "./FilterSelect";
import { Pagination } from "./Pagination";
import { Pill, type PillTone } from "./Pill";
import { SectionTitle } from "./SectionTitle";
import { StatTile } from "./StatTile";

const PAGE_SIZE = 50;

function outcomeTone(outcome: string): PillTone {
  if (outcome === "Purchased") return "good";
  if (outcome === "Not Reached / No Visit") return "bad";
  if (outcome === "Pending / Rescheduled") return "warn";
  return "neutral";
}

interface AppointmentSummary {
  total: number;
  purchased: number;
  visitRate: number;
}

interface AppointmentCharts {
  byCity: { name: string; appointments: number; purchases: number }[];
}

interface AppointmentOptions {
  cities: string[];
  outcomes: string[];
}

export function AppointmentsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(0);

  const city = searchParams.get(APPOINTMENT_FILTER_KEYS.city) ?? "";
  const outcome = searchParams.get(APPOINTMENT_FILTER_KEYS.outcome) ?? "";
  const dateFrom = searchParams.get(APPOINTMENT_FILTER_KEYS.from) ?? "";
  const dateTo = searchParams.get(APPOINTMENT_FILTER_KEYS.to) ?? "";
  // Full current query string (including the Lead Funnel section's own params, which
  // coexist in the same URL) forwarded verbatim to every endpoint below - see
  // LeadsSection for why that's the mechanism that keeps them all in sync.
  const queryString = searchParams.toString();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    setPage(0);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const { data: tableData, error: tableError } = useFetchJson<{ appointments: StoreAppointmentRow[] }>(
    `/api/appointments?${queryString}`
  );
  const { data: summary, error: summaryError } = useFetchJson<AppointmentSummary>(`/api/appointments/summary?${queryString}`);
  const { data: charts, error: chartsError } = useFetchJson<AppointmentCharts>(`/api/appointments/charts?${queryString}`);
  const { data: options } = useFetchJson<AppointmentOptions>("/api/appointments/options"); // never filtered

  const appointments = tableData?.appointments ?? null;
  const error = tableError ?? summaryError ?? chartsError;

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>Failed to load appointments: {error}</p>;
  if (!appointments || !summary || !charts) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading appointments...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <StatTile label="Total Appointments" value={summary.total.toLocaleString()} accent="var(--primary)" />
        <StatTile label="Purchased" value={summary.purchased.toLocaleString()} accent="var(--teal)" />
        <StatTile label="Visit Rate" value={`${summary.visitRate}%`} sublabel="visited / booked" accent="var(--gold)" />
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Appointment records</SectionTitle>
        <div
          className="rounded-[var(--radius)] px-5 py-[18px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
        >
          <div className="mb-3.5 flex flex-wrap gap-3">
            <DateField label="Visit from" value={dateFrom} onChange={(v) => setFilter(APPOINTMENT_FILTER_KEYS.from, v)} />
            <DateField label="Visit to" value={dateTo} onChange={(v) => setFilter(APPOINTMENT_FILTER_KEYS.to, v)} />
            <FilterSelect
              label="City"
              value={city}
              options={options?.cities ?? []}
              onChange={(v) => setFilter(APPOINTMENT_FILTER_KEYS.city, v)}
            />
            <FilterSelect
              label="Outcome"
              value={outcome}
              options={options?.outcomes ?? []}
              onChange={(v) => setFilter(APPOINTMENT_FILTER_KEYS.outcome, v)}
            />
          </div>

          <div className="max-h-[480px] overflow-auto rounded-[10px]" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Date of Booking", "Name", "Date of visit", "Store location", "Outcome", "Notes"].map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 whitespace-nowrap px-3 py-2.5 text-left text-[11.5px] font-bold tracking-[.03em] text-white uppercase"
                      style={{ background: "var(--primary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((a) => (
                  <tr key={a.id} className="even:bg-[var(--surface-alt)] hover:bg-[var(--gold-light)]">
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {a.date_of_booking ?? a.date_of_booking_raw}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {a.name || "-"}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-[9px]"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        color: a.visit_date_precision === "approximate" ? "var(--text-secondary)" : "var(--text)",
                        fontStyle: a.visit_date_precision === "approximate" ? "italic" : "normal",
                      }}
                      title={
                        a.visit_date_precision === "approximate"
                          ? "Approximate - no exact day was given, defaulted to the 1st of the month"
                          : a.visit_date_note
                            ? `Original range: ${a.visit_date_note}`
                            : undefined
                      }
                    >
                      {a.visit_date_precision === "approximate" ? "~ " : ""}
                      {a.date_of_visit ?? a.date_of_visit_raw}
                      {a.visit_date_note && <span style={{ color: "var(--text-muted)" }}> (range)</span>}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-[9px]"
                      style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}
                      title={`raw: ${a.store_location_raw}`}
                    >
                      {a.city || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)" }}>
                      <Pill tone={outcomeTone(a.visit_outcome)}>{a.visit_outcome}</Pill>
                    </td>
                    <td
                      className="max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-[9px]"
                      style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      title={a.notes || undefined}
                    >
                      {a.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(appointments.length / PAGE_SIZE))}
            total={appointments.length}
            onChange={setPage}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Visual analysis</SectionTitle>
        <BarChartCard
          title="Appointments and purchases by city"
          data={charts.byCity}
          series={[
            { key: "appointments", label: "Appointments", color: CHART_PALETTE[0] },
            { key: "purchases", label: "Purchases", color: CHART_PALETTE[1] },
          ]}
        />
      </div>
    </div>
  );
}
