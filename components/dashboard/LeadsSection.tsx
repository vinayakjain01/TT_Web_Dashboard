"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadRow } from "@/lib/types/db";
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

function statusTone(status: string): PillTone {
  const s = status.toLowerCase();
  if (s.includes("convert")) return "good";
  if (s.includes("refus") || s === "not responding") return "bad";
  if (s.includes("store appointment") || s.includes("hot lead") || s.includes("payment link")) return "warn";
  return "neutral";
}

export function LeadsSection() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => setLeads(data.leads))
      .catch((err) => setError(String(err)));
  }, []);

  const realLeads = useMemo(() => (leads ?? []).filter((l) => !l.is_test_record), [leads]);

  const kpis = useMemo(() => {
    const total = realLeads.length;
    const converted = realLeads.filter((l) => l.is_converted).length;
    const storeAppointments = realLeads.filter((l) => l.is_store_appointment).length;
    return {
      total,
      converted,
      conversionRate: total ? ((converted / total) * 100).toFixed(1) : "0.0",
      storeAppointments,
    };
  }, [realLeads]);

  const statusOptions = useMemo(() => distinct((leads ?? []).map((l) => l.status)), [leads]);
  const countryOptions = useMemo(() => distinct((leads ?? []).map((l) => l.country)), [leads]);
  const sourceOptions = useMemo(() => distinct((leads ?? []).map((l) => l.source)), [leads]);

  const filtered = useMemo(() => {
    return (leads ?? []).filter(
      (l) =>
        (!status || l.status === status) &&
        (!country || l.country === country) &&
        (!source || l.source === source) &&
        (!dateFrom || (l.date ?? "") >= dateFrom) &&
        (!dateTo || (l.date ?? "") <= dateTo)
    );
  }, [leads, status, country, source, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  const leadsByCountry = useMemo(() => {
    const map = new Map<string, { total: number; converted: number }>();
    for (const l of realLeads) {
      const key = l.country.trim() || "Unknown";
      const entry = map.get(key) ?? { total: 0, converted: 0 };
      entry.total += 1;
      if (l.is_converted) entry.converted += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, v]) => ({ name, total: v.total, converted: v.converted }));
  }, [realLeads]);

  const leadsBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of realLeads) {
      const key = l.source.trim() || "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [realLeads]);

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>Failed to load leads: {error}</p>;
  if (!leads) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading leads...</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile label="Total Leads" value={kpis.total.toLocaleString()} sublabel="excludes test records" accent="var(--primary)" />
        <StatTile label="Converted Leads" value={kpis.converted.toLocaleString()} accent="var(--teal)" />
        <StatTile label="Conversion Rate" value={`${kpis.conversionRate}%`} accent="var(--gold)" />
        <StatTile label="Store Appointments Booked" value={kpis.storeAppointments.toLocaleString()} accent="var(--primary-light)" />
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Lead records</SectionTitle>
        <div
          className="rounded-[var(--radius)] px-5 py-[18px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
        >
          <div className="mb-3.5 flex flex-wrap gap-3">
            <DateField label="From date" value={dateFrom} onChange={(v) => updateFilter(setDateFrom, v)} />
            <DateField label="To date" value={dateTo} onChange={(v) => updateFilter(setDateTo, v)} />
            <FilterSelect label="Status" value={status} options={statusOptions} onChange={(v) => updateFilter(setStatus, v)} />
            <FilterSelect label="Country" value={country} options={countryOptions} onChange={(v) => updateFilter(setCountry, v)} />
            <FilterSelect label="Source" value={source} options={sourceOptions} onChange={(v) => updateFilter(setSource, v)} />
          </div>

          <div className="max-h-[480px] overflow-auto rounded-[10px]" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Date", "Customer Name", "Source", "Country", "Status", "Phone", "Sale Amount"].map((h) => (
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
                {pageRows.map((l) => (
                  <tr key={l.id} className="even:bg-[var(--surface-alt)] hover:bg-[var(--gold-light)]">
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {l.date ?? l.date_raw}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {l.customer_name || "-"}
                      {l.is_test_record && (
                        <span className="ml-2">
                          <Pill tone="warn">test</Pill>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {l.source || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {l.country || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)" }}>
                      <Pill tone={statusTone(l.status)}>{l.status || "-"}</Pill>
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px]" style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      {l.phone_raw || "-"}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-[9px]"
                      style={{ borderBottom: "1px solid var(--border)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                    >
                      {l.sale_amount ? l.sale_amount.toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Visual analysis</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartCard
            title="Leads by Country (top 10) - total vs converted"
            data={leadsByCountry}
            series={[
              { key: "total", label: "Total leads", color: CHART_PALETTE[0] },
              { key: "converted", label: "Converted", color: CHART_PALETTE[1] },
            ]}
          />
          <BarChartCard
            title="Leads by Source"
            data={leadsBySource}
            series={[{ key: "count", label: "Leads", color: CHART_PALETTE[0] }]}
          />
        </div>
      </div>
    </div>
  );
}
