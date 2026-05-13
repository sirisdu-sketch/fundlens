import Link from "next/link";

import { signalColor } from "@/lib/signals";
import type { Fund, IndicatorPoint, Signal } from "@/lib/types";

interface Props {
  fund: Fund;
  signal: Signal | null;
  latest: IndicatorPoint | null;
  close: number | null;
}

export function FundCard({ fund, signal, latest, close }: Props) {
  const c = signal ? signalColor(signal.level) : null;

  return (
    <Link
      href={`/${fund.code}`}
      className="group relative block rounded-xl border border-ink-800 bg-ink-900/40 p-5 transition-all hover:border-amber/40 hover:bg-ink-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
            {fund.code}
          </div>
          <div className="mt-1 truncate text-ink-100 group-hover:text-amber-bright transition-colors">
            {fund.name}
          </div>
        </div>
        {signal && c && (
          <span
            className={`shrink-0 rounded-md border ${c.border} ${c.bg} ${c.text} px-2 py-0.5 text-xs`}
          >
            {signal.label}
          </span>
        )}
      </div>

      {latest && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Stat
            label="净值"
            value={close !== null ? close.toFixed(4) : "—"}
          />
          <Stat
            label="RSI"
            value={latest.rsi14 !== null ? latest.rsi14.toFixed(0) : "—"}
          />
          <Stat
            label="动量"
            value={
              latest.momentum20 !== null
                ? `${latest.momentum20 >= 0 ? "+" : ""}${latest.momentum20.toFixed(1)}%`
                : "—"
            }
            tone={
              latest.momentum20 === null
                ? undefined
                : latest.momentum20 >= 0
                  ? "up"
                  : "down"
            }
          />
        </div>
      )}

      {!latest && (
        <div className="mt-4 text-xs text-ink-500">暂无指标数据</div>
      )}
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink-200";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className={`mt-0.5 font-mono ${toneClass}`}>{value}</div>
    </div>
  );
}
