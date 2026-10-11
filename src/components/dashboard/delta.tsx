import { formatInrDelta, formatPct, trend } from "@/lib/format";

const COLOR = { up: "text-up", down: "text-down", flat: "text-muted" } as const;
const ARROW = { up: "▲", down: "▼", flat: "■" } as const;

export function Delta({
  amount,
  pct,
  suffix,
  className = "",
}: {
  amount?: number;
  pct: number;
  suffix?: string;
  className?: string;
}) {
  const t = trend(pct);
  return (
    <span className={`font-mono ${COLOR[t]} ${className}`}>
      <span aria-hidden>{ARROW[t]}</span>{" "}
      {amount !== undefined && <>{formatInrDelta(amount)} · </>}
      {formatPct(pct)}
      {suffix && <> {suffix}</>}
    </span>
  );
}

export function deltaColor(value: number) {
  return COLOR[trend(value)];
}
