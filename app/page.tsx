import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DataSourceTag } from "@/components/dashboard/DataSourceTag";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-xl font-serif text-xl font-semibold text-white"
            style={{ background: "var(--primary)", boxShadow: "0 6px 14px var(--shadow)" }}
          >
            TT
          </div>
          <div>
            <h1 className="text-[26px]" style={{ color: "var(--primary-dark)" }}>
              Tarun Tahiliani
            </h1>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Lead &amp; store appointment dashboard
            </p>
          </div>
        </div>
        <DataSourceTag />
      </header>
      <DashboardTabs />
    </main>
  );
}
