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
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-hairline)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="px-3 py-2 text-sm font-medium"
            style={{
              color: active === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: active === tab.key ? "2px solid var(--series-1)" : "2px solid transparent",
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
