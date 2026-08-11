export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[150px] rounded-lg px-2.5 py-2 text-[13px] font-normal normal-case"
        style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
      />
    </label>
  );
}
