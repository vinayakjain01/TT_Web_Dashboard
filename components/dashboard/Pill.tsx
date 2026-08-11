export type PillTone = "good" | "warn" | "bad" | "neutral";

const TONE_STYLES: Record<PillTone, { background: string; color: string }> = {
  good: { background: "var(--teal-bg)", color: "var(--teal)" },
  warn: { background: "var(--amber-bg)", color: "var(--amber)" },
  bad: { background: "var(--coral-bg)", color: "var(--coral)" },
  neutral: { background: "var(--surface-alt)", color: "var(--text-secondary)" },
};

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: PillTone }) {
  return (
    <span
      className="inline-block rounded-[14px] px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap"
      style={TONE_STYLES[tone]}
    >
      {children}
    </span>
  );
}
