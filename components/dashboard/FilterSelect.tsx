export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[150px] rounded-lg px-2.5 py-2 text-[13px] font-normal normal-case"
        style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "(blank)"}
          </option>
        ))}
      </select>
    </label>
  );
}
