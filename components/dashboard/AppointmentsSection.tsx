"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreAppointmentRow } from "@/lib/types/db";
import { BarChartCard, CHART_PALETTE } from "./BarChartCard";
import { DateField } from "./DateField";
import { FilterSelect } from "./FilterSelect";
import { Pagination } from "./Pagination";
import { Pill, type PillTone } from "./Pill";
import { SectionTitle } from "./SectionTitle";
import { StatTile } from "./StatTile";

const PAGE_SIZE = 50;

function distinct(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim()))).sort();
}

function isYes(flag: string): boolean {
  return /^y/i.test(flag.trim());
}

function isVisited(a: StoreAppointmentRow): boolean {
  return a.visit_outcome === "Purchased" || a.visit_outcome === "Visited, No Purchase" || isYes(a.visited_flag_raw);
}

function isPurchased(a: StoreAppointmentRow): boolean {
  return a.visit_outcome === "Purchased" || isYes(a.order_placed_flag_raw);
}

function outcomeTone(outcome: string): PillTone {
  if (outcome === "Purchased") return "good";
  if (outcome === "Not Reached / No Visit") return "bad";
  if (outcome === "Pending / Rescheduled") return "warn";
  return "neutral";
}

export function AppointmentsSection() {
  const [appointments, setAppointments] = useState<StoreAppointmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [outcome, setOutcome] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/appointments")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(String(err)));
  }, []);

  const kpis = useMemo(() => {
    const list = appointments ?? [];
    const total = list.length;
    const purchased = list.filter(isPurchased).length;
    const visited = list.filter(isVisited).length;
    return { total, purchased, visitRate: total ? ((visited / total) * 100).toFixed(1) : "0.0" };
  }, [appointments]);

  const cityOptions = useMemo(() => distinct((appointments ?? []).map((a) => a.city)), [appointments]);
  const outcomeOptions = useMemo(() => distinct((appointments ?? []).map((a) => a.visit_outcome)), [appointments]);

  const filtered = useMemo(() => {
    return (appointments ?? []).filter(
      (a) =>
        (!city || a.city === city) &&
        (!outcome || a.visit_outcome === outcome) &&
        (!dateFrom || (a.date_of_visit ?? "") >= dateFrom) &&
        (!dateTo || (a.date_of_visit ?? "") <= dateTo)
    );
  }, [appointments, city, outcome, dateFrom, dateTo]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  const byCity = useMemo(() => {
    const map = new Map<string, { appointments: number; purchases: number }>();
    for (const a of appointments ?? []) {
      const key = a.city.trim() || "Unknown";
      const entry = map.get(key) ?? { appointments: 0, purchases: 0 };
      entry.appointments += 1;
      if (isPurchased(a)) entry.purchases += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].appointments - a[1].appointments)
      .map(([name, v]) => ({ name, appointments: v.appointments, purchases: v.purchases }));
  }, [appointments]);

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>Failed to load appointments: {error}</p>;
  if (!appointments)
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading appointments...
      </p>
    );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <StatTile label="Total Appointments" value={kpis.total.toLocaleString()} accent="var(--primary)" />
        <StatTile label="Purchased" value={kpis.purchased.toLocaleString()} accent="var(--teal)" />
        <StatTile label="Visit Rate" value={`${kpis.visitRate}%`} sublabel="visited / booked" accent="var(--gold)" />
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Appointment records</SectionTitle>
        <div
          className="rounded-[var(--radius)] px-5 py-[18px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
        >
          <div className="mb-3.5 flex flex-wrap gap-3">
            <DateField label="Visit from" value={dateFrom} onChange={(v) => updateFilter(setDateFrom, v)} />
            <DateField label="Visit to" value={dateTo} onChange={(v) => updateFilter(setDateTo, v)} />
            <FilterSelect label="City" value={city} options={cityOptions} onChange={(v) => updateFilter(setCity, v)} />
            <FilterSelect label="Outcome" value={outcome} options={outcomeOptions} onChange={(v) => updateFilter(setOutcome, v)} />
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
                {filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((a) => (
                  <tr key={a.id} className="even:bg-[var(--surface-alt)] hover:bg-[var(--gold-light)]">
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {a.date_of_booking ?? a.date_of_booking_raw}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {a.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {a.date_of_visit ?? a.date_of_visit_raw}
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
            pageCount={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
            total={filtered.length}
            onChange={setPage}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Visual analysis</SectionTitle>
        <BarChartCard
          title="Appointments and purchases by city"
          data={byCity}
          series={[
            { key: "appointments", label: "Appointments", color: CHART_PALETTE[0] },
            { key: "purchases", label: "Purchases", color: CHART_PALETTE[1] },
          ]}
        />
      </div>
    </div>
  );
}
