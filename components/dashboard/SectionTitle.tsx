export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="inline-block text-[15px] tracking-[.06em] uppercase"
      style={{ color: "var(--primary-dark)", borderBottom: "2px dashed var(--gold)", paddingBottom: 8 }}
    >
      {children}
    </h2>
  );
}
