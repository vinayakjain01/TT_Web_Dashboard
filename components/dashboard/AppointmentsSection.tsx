"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreAppointmentRow } from "@/lib/types/db";
import { BarChartCard } from "./BarChartCard";
import { Pagination } from "./Pagination";
import { ReviewCallout } from "./ReviewCallout";
import { StatTile } from "./StatTile";

const PAGE_SIZE = 50;

function isYes(flag: string): boolean {
  return /^y/i.test(flag.trim());
}

function isVisited(a: StoreAppointmentRow): boolean {
  return a.visit_outcome === "Purchased" || a.visit_outcome === "Visited, No Purchase" || isYes(a.visited_flag_raw);
}

function isPurchased(a: StoreAppointmentRow): boolean {
  return a.visit_outcome === "Purchased" || isYes(a.order_placed_flag_raw);
}

export function AppointmentsSection() {
  const [appointments, setAppointments] = useState<StoreAppointmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const dateReview = useMemo(() => (appointments ?? []).filter((a) => a.date_needs_review), [appointments]);
  const locationReview = useMemo(() => (appointments ?? []).filter((a) => a.location_needs_review), [appointments]);

  if (error) return <p className="text-sm text-red-500">Failed to load appointments: {error}</p>;
  if (!appointments)
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading appointments...
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total Appointments" value={kpis.total.toLocaleString()} />
        <StatTile label="Purchased" value={kpis.purchased.toLocaleString()} />
        <StatTile label="Visit Rate" value={`${kpis.visitRate}%`} sublabel="visited / booked" />
      </div>

      <BarChartCard
        title="Appointments and purchases by city"
        data={byCity}
        series={[
          { key: "appointments", label: "Appointments", color: "var(--series-1)" },
          { key: "purchases", label: "Purchases", color: "var(--series-2)" },
        ]}
      />

      <div className="flex flex-col gap-3">
        <ReviewCallout count={dateReview.length} label="appointments with an unresolved date" />
        <ReviewCallout count={locationReview.length} label="appointments with an unrecognized store location" />
        {(dateReview.length > 0 || locationReview.length > 0) && (
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-hairline)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                  {["Tab", "Name", "Issue", "Booking (raw)", "Visit (raw)", "Location (raw)", "Reason"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...dateReview.map((a) => ({ a, issue: "Date" })), ...locationReview.map((a) => ({ a, issue: "Location" }))].map(
                  ({ a, issue }, i) => (
                    <tr key={`${issue}-${a.id}-${i}`} style={{ borderBottom: "1px solid var(--gridline)" }}>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {a.tab_title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-primary)" }}>
                        {a.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--status-warning)" }}>
                        {issue}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {a.date_of_booking_raw || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {a.date_of_visit_raw || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {a.store_location_raw || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                        {a.date_review_reason ?? "unrecognized location"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-hairline)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
              {["Date of Booking", "Name", "Date of visit", "Store location", "Outcome"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {a.date_of_booking ?? a.date_of_booking_raw}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-primary)" }}>
                  {a.name || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {a.date_of_visit ?? a.date_of_visit_raw}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2"
                  style={{ color: "var(--text-secondary)" }}
                  title={`raw: ${a.store_location_raw}`}
                >
                  {a.city || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {a.visit_outcome}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={Math.max(1, Math.ceil(appointments.length / PAGE_SIZE))}
          total={appointments.length}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
