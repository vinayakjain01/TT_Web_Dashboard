"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadJourneyRow } from "@/lib/types/db";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 50;

export function JourneySection() {
  const [rows, setRows] = useState<LeadJourneyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/journey")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => setRows(data.journey))
      .catch((err) => setError(String(err)));
  }, []);

  const pageRows = useMemo(() => (rows ?? []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [rows, page]);

  if (error) return <p className="text-sm text-red-500">Failed to load journey view: {error}</p>;
  if (!rows) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading journey view...</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Leads matched to a store-appointment record by phone or a close name match ({rows.length} matched). Every
        lead and appointment still appears in its own section regardless of whether a match was found here.
      </p>
      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-hairline)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
              {["Customer", "Lead Source", "Lead Date", "Match", "Booking", "Visit", "City", "Outcome"].map((h) => (
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
            {pageRows.map((r) => (
              <tr key={`${r.lead_source_row_index}-${r.appointment_tab_gid}`} style={{ borderBottom: "1px solid var(--gridline)" }}>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-primary)" }}>
                  {r.customer_name || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.lead_source || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.lead_date ?? "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.match_basis}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.date_of_booking ?? "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.date_of_visit ?? "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.appointment_city || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                  {r.visit_outcome}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageCount={Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
          total={rows.length}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
