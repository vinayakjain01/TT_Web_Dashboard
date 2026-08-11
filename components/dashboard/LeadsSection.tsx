"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadRow } from "@/lib/types/db";
import { BarChartCard } from "./BarChartCard";
import { Badge } from "./ReviewCallout";
import { FilterSelect } from "./FilterSelect";
import { Pagination } from "./Pagination";
import { StatTile } from "./StatTile";

const PAGE_SIZE = 50;

function distinct(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim()))).sort();
}

export function LeadsSection() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
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
      (l) => (!status || l.status === status) && (!country || l.country === country) && (!source || l.source === source)
    );
  }, [leads, status, country, source]);

  useEffect(() => setPage(0), [status, country, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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

  if (error) return <p className="text-sm text-red-500">Failed to load leads: {error}</p>;
  if (!leads) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading leads...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Leads" value={kpis.total.toLocaleString()} sublabel="excludes test records" />
        <StatTile label="Converted Leads" value={kpis.converted.toLocaleString()} />
        <StatTile label="Conversion Rate" value={`${kpis.conversionRate}%`} />
        <StatTile label="Store Appointments Booked" value={kpis.storeAppointments.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Leads by Country (top 10) - total vs converted"
          data={leadsByCountry}
          series={[
            { key: "total", label: "Total leads", color: "var(--series-1)" },
            { key: "converted", label: "Converted", color: "var(--series-2)" },
          ]}
        />
        <BarChartCard
          title="Leads by Source"
          data={leadsBySource}
          series={[{ key: "count", label: "Leads", color: "var(--series-1)" }]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Status" value={status} options={statusOptions} onChange={setStatus} />
          <FilterSelect label="Country" value={country} options={countryOptions} onChange={setCountry} />
          <FilterSelect label="Source" value={source} options={sourceOptions} onChange={setSource} />
        </div>

        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border-hairline)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                {["Date", "Customer Name", "Source", "Country", "Status", "Phone", "Sale Amount"].map((h) => (
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
              {pageRows.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--gridline)" }}>
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {l.date ?? l.date_raw}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span style={{ color: "var(--text-primary)" }}>{l.customer_name || "-"}</span>
                    {l.is_test_record && (
                      <span className="ml-2">
                        <Badge tone="warning">test</Badge>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {l.source || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {l.country || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {l.status || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {l.phone_raw || "-"}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2"
                    style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {l.sale_amount ? l.sale_amount.toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
