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

      {active === "leads" && <LeadsSection />}
      {active === "appointments" && <AppointmentsSection />}
      {active === "journey" && <JourneySection />}
    </div>
  );
}
