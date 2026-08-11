"use client";

import { useState } from "react";
import { AppointmentsSection } from "./AppointmentsSection";
import { JourneySection } from "./JourneySection";
import { LeadsSection } from "./LeadsSection";

const TABS = [
  { key: "leads", label: "Lead Funnel" },
  { key: "appointments", label: "Store Appointments" },
  { key: "journey", label: "Lead Journey" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DashboardTabs() {
  const [active, setActive] = useState<TabKey>("leads");

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex gap-1 self-start rounded-xl p-1"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        role="group"
        aria-label="Dashboard section"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="rounded-[9px] px-4 py-2 text-[13px] font-bold"
            style={{
              background: active === tab.key ? "var(--primary)" : "transparent",
              color: active === tab.key ? "#fff" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/*
        All three sections stay mounted - each fetches once on first mount and keeps
        its data in memory. Switching tabs used to unmount/remount the section, which
        threw away already-fetched data and re-ran every Supabase query (7 paginated
        calls for ~7,500 leads) on every single click. display:none just hides the
        inactive ones instead, so a tab switch after the first load is instant.
      */}
      <div style={{ display: active === "leads" ? "block" : "none" }}>
        <LeadsSection />
      </div>
      <div style={{ display: active === "appointments" ? "block" : "none" }}>
        <AppointmentsSection />
      </div>
      <div style={{ display: active === "journey" ? "block" : "none" }}>
        <JourneySection />
      </div>
    </div>
  );
}
