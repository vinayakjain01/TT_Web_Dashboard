export function Pagination({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
      <span>
        Page {page + 1} of {pageCount} ({total} rows)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded-lg px-3 py-1 font-semibold disabled:opacity-40"
          style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text-secondary)" }}
        >
          Prev
        </button>
        <button
          onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="rounded-lg px-3 py-1 font-semibold disabled:opacity-40"
          style={{ border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text-secondary)" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
