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
    <div className="flex items-center justify-between px-1 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
      <span>
        Page {page + 1} of {pageCount} ({total} rows)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded px-2 py-1 disabled:opacity-40"
          style={{ border: "1px solid var(--border-hairline)" }}
        >
          Prev
        </button>
        <button
          onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="rounded px-2 py-1 disabled:opacity-40"
          style={{ border: "1px solid var(--border-hairline)" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
