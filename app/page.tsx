import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Tarun Tahiliani - Lead &amp; Store Appointment Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Synced from the lead funnel and store appointment sheets.
        </p>
      </header>
      <DashboardTabs />
    </main>
  );
}
