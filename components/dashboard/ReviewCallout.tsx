export function ReviewCallout({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
      style={{
        background: "color-mix(in srgb, var(--status-warning) 14%, var(--surface-1))",
        border: "1px solid color-mix(in srgb, var(--status-warning) 45%, transparent)",
        color: "var(--text-primary)",
      }}
    >
      <span aria-hidden style={{ color: "var(--status-warning)" }}>
        ⚠
      </span>
      <span>
        <strong>{count}</strong> {label} - needs a human look, not guessed.
      </span>
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warning" }) {
  const color = tone === "warning" ? "var(--status-warning)" : "var(--text-muted)";
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ border: `1px solid ${color}`, color }}
    >
      {children}
    </span>
  );
}
