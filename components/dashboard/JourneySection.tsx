"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadJourneyRow } from "@/lib/types/db";
import { Pagination } from "./Pagination";
import { Pill, type PillTone } from "./Pill";
import { SectionTitle } from "./SectionTitle";

const PAGE_SIZE = 50;

function outcomeTone(outcome: string): PillTone {
  if (outcome === "Purchased") return "good";
  if (outcome === "Not Reached / No Visit") return "bad";
  if (outcome === "Pending / Rescheduled") return "warn";
  return "neutral";
}

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

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>Failed to load journey view: {error}</p>;
  if (!rows) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading journey view...</p>;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Lead journey</SectionTitle>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Leads matched to a store-appointment record by phone or a close name match ({rows.length} matched). Every
        lead and appointment still appears in its own section regardless of whether a match was found here.
      </p>
      <div
        className="rounded-[var(--radius)] px-5 py-[18px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
      >
        <div className="max-h-[480px] overflow-auto rounded-[10px]" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Customer", "Lead Source", "Lead Date", "Match", "Booking", "Visit", "City", "Outcome"].map((h) => (
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
              {pageRows.map((r) => (
                <tr
                  key={`${r.lead_source_row_index}-${r.appointment_tab_gid}`}
                  className="even:bg-[var(--surface-alt)] hover:bg-[var(--gold-light)]"
                >
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                    {r.customer_name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {r.lead_source || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {r.lead_date ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Pill tone="neutral">{r.match_basis}</Pill>
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {r.date_of_booking ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {r.date_of_visit ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {r.appointment_city || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Pill tone={outcomeTone(r.visit_outcome)}>{r.visit_outcome}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
