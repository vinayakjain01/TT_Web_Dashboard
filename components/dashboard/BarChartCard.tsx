"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Same series order as the MM_Web_Dashboard reference's Chart.js PALETTE.
export const CHART_PALETTE = ["#4B2E83", "#C6922E", "#1E9E7C", "#8567C4", "#E0972A", "#D6483F", "#6B6280", "#341F5C"];

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export function BarChartCard({
  title,
  data,
  series,
  height = 260,
}: {
  title: string;
  data: Record<string, string | number>[];
  series: BarSeries[];
  height?: number;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius)] px-5 py-[18px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
    >
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--border)"
            tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-manrope)" }}
            tickLine={false}
          />
          <YAxis
            stroke="var(--border)"
            tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-manrope)" }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
              fontSize: 12,
              fontFamily: "var(--font-manrope)",
            }}
            cursor={{ fill: "var(--gold-light)" }}
          />
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-manrope)" }} />
          )}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={40} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
