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
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md px-2 py-1.5 text-sm"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-hairline)",
          color: "var(--text-primary)",
        }}
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
