"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LEAD_FILTER_KEYS } from "@/lib/filters/leadFilters";
import { useFetchJson } from "@/lib/hooks/useFetchJson";
import type { LeadRow, UnclearLeadRow } from "@/lib/types/db";
import { BarChartCard, CHART_PALETTE } from "./BarChartCard";
import { DateField } from "./DateField";
import { FilterSelect } from "./FilterSelect";
import { Pagination } from "./Pagination";
import { Pill, type PillTone } from "./Pill";
import { SectionTitle } from "./SectionTitle";
import { StatTile } from "./StatTile";

const PAGE_SIZE = 50;

function statusTone(status: string): PillTone {
  const s = status.toLowerCase();
  if (s.includes("convert")) return "good";
  if (s.includes("refus") || s === "not responding") return "bad";
  if (s.includes("store appointment") || s.includes("hot lead") || s.includes("payment link")) return "warn";
  return "neutral";
}

interface LeadSummary {
  total: number;
  converted: number;
  conversionRate: number;
  storeAppointments: number;
  paymentLinkSent: number;
}

interface LeadCharts {
  byCountry: { name: string; total: number; converted: number }[];
  bySource: { name: string; count: number }[];
}

interface LeadOptions {
  statuses: string[];
  countries: string[];
  sources: string[];
}

export function LeadsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(0);

  const status = searchParams.get(LEAD_FILTER_KEYS.status) ?? "";
  const country = searchParams.get(LEAD_FILTER_KEYS.country) ?? "";
  const source = searchParams.get(LEAD_FILTER_KEYS.source) ?? "";
  const dateFrom = searchParams.get(LEAD_FILTER_KEYS.from) ?? "";
  const dateTo = searchParams.get(LEAD_FILTER_KEYS.to) ?? "";
  // The FULL current query string (both this section's and Store Appointments' params,
  // which coexist in the same URL) is forwarded verbatim to every one of this
  // section's endpoints - table, summary, charts all see byte-for-byte the same
  // filters, so none of them can end up applying a different set than the others.
  const queryString = searchParams.toString();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    setPage(0);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const { data: tableData, error: tableError } = useFetchJson<{ leads: LeadRow[] }>(`/api/leads?${queryString}`);
  const { data: summary, error: summaryError } = useFetchJson<LeadSummary>(`/api/leads/summary?${queryString}`);
  const { data: charts, error: chartsError } = useFetchJson<LeadCharts>(`/api/leads/charts?${queryString}`);
  const { data: options } = useFetchJson<LeadOptions>("/api/leads/options"); // never filtered - see route comment
  // Same endpoint the "Unclear Leads" block at the top of the Lead Journey tab reads -
  // both fetch independently from the same URL filter state, so the KPI count here can
  // never drift from what that table shows.
  const { data: unclearData, error: unclearError } = useFetchJson<{ leads: UnclearLeadRow[] }>(
    `/api/leads/unclear?${queryString}`
  );

  const leads = tableData?.leads ?? null;
  const error = tableError ?? summaryError ?? chartsError ?? unclearError;

  const pageCount = Math.max(1, Math.ceil((leads?.length ?? 0) / PAGE_SIZE));
  const pageRows = (leads ?? []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>Failed to load leads: {error}</p>;
  if (!leads || !summary || !charts || !unclearData) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading leads...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total Leads" value={summary.total.toLocaleString()} accent="var(--primary)" />
        <StatTile label="Converted Leads" value={summary.converted.toLocaleString()} accent="var(--teal)" />
        <StatTile label="Conversion Rate" value={`${summary.conversionRate}%`} accent="var(--gold)" />
        <StatTile label="Store Appointments Booked" value={summary.storeAppointments.toLocaleString()} accent="var(--primary-light)" />
        <StatTile label="Payment Link Sent" value={summary.paymentLinkSent.toLocaleString()} accent="var(--amber)" />
        <StatTile
          label="Unclear Leads"
          value={unclearData.leads.length.toLocaleString()}
          sublabel="booked store appointment but not visited or not purchased"
          accent="var(--coral)"
        />
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Lead records</SectionTitle>
        <div
          className="rounded-[var(--radius)] px-5 py-[18px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
        >
          <div className="mb-3.5 flex flex-wrap gap-3">
            <DateField label="From date" value={dateFrom} onChange={(v) => setFilter(LEAD_FILTER_KEYS.from, v)} />
            <DateField label="To date" value={dateTo} onChange={(v) => setFilter(LEAD_FILTER_KEYS.to, v)} />
            <FilterSelect
              label="Status"
              value={status}
              options={options?.statuses ?? []}
              onChange={(v) => setFilter(LEAD_FILTER_KEYS.status, v)}
            />
            <FilterSelect
              label="Country"
              value={country}
              options={options?.countries ?? []}
              onChange={(v) => setFilter(LEAD_FILTER_KEYS.country, v)}
            />
            <FilterSelect
              label="Source"
              value={source}
              options={options?.sources ?? []}
              onChange={(v) => setFilter(LEAD_FILTER_KEYS.source, v)}
            />
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
          <Pagination page={page} pageCount={pageCount} total={leads.length} onChange={setPage} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Visual analysis</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartCard
            title="Leads by Country (top 10) - total vs converted"
            data={charts.byCountry}
            series={[
              { key: "total", label: "Total leads", color: CHART_PALETTE[0] },
              { key: "converted", label: "Converted", color: CHART_PALETTE[1] },
            ]}
          />
          <BarChartCard
            title="Leads by Source"
            data={charts.bySource}
            series={[{ key: "count", label: "Leads", color: CHART_PALETTE[0] }]}
          />
        </div>
      </div>
    </div>
  );
}
