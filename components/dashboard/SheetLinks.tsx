const LEAD_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1NvXaOurTqKPYpndiIhCfszfB8V_U0iRhhVVa5aBhXgQ/edit?gid=1816174605";
const APPOINTMENT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Kb7qHzaRTc8KTwqsb8g3GUFtKNd9rbkXV8FsFBAl2rI/edit";

function SheetLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}
    >
      {children}
      <span aria-hidden>&#8599;</span>
    </a>
  );
}

export function SheetLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <SheetLink href={LEAD_SHEET_URL}>Lead Funnel Sheet</SheetLink>
      <SheetLink href={APPOINTMENT_SHEET_URL}>Store Appointments Sheet</SheetLink>
    </div>
  );
}
