export function ReviewCallout({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm"
      style={{ background: "var(--amber-bg)", border: "1px solid var(--gold-light)", color: "var(--text)" }}
    >
      <span aria-hidden style={{ color: "var(--amber)" }}>
        &#9888;
      </span>
      <span>
        <strong>{count}</strong> {label} - needs a human look, not guessed.
      </span>
    </div>
  );
}
