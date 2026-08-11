export function StatTile({
  label,
  value,
  sublabel,
  accent = "var(--gold)",
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius)] px-[18px] pt-[18px] pb-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 3px 10px var(--shadow)" }}
    >
      <span className="absolute top-0 left-[18px] h-[10px] w-7 rounded-b" style={{ background: accent }} />
      <div className="mt-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div className="mt-1.5 font-serif text-[28px] font-semibold" style={{ color: "var(--primary-dark)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
