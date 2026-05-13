import { signalColor } from "@/lib/signals";
import type { IndicatorPoint, Signal } from "@/lib/types";

interface Props {
  signal: Signal;
  latest: IndicatorPoint;
  close: number;
  showRules?: boolean;  // 给我自己看的调试信息
}

export function SignalCard({ signal, latest, close, showRules = false }: Props) {
  const c = signalColor(signal.level);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-7 md:p-9`}
    >
      {/* 等级标签 */}
      <div className="flex items-baseline gap-3">
        <span className={`text-xs uppercase tracking-[0.2em] ${c.text}`}>
          操作建议
        </span>
        <span className="text-xs text-ink-500 font-mono">
          {latest.date}
        </span>
      </div>

      {/* 主标签 — 大字号衬线 */}
      <div className="mt-3 flex items-end gap-5">
        <div className={`display text-6xl md:text-7xl ${c.text}`}>
          {signal.label}
        </div>
        <div className="pb-2 text-ink-400 text-sm md:text-base">
          {signal.reason}
        </div>
      </div>

      {/* 关键指标小条 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="累计净值" value={close.toFixed(4)} />
        <Metric
          label="RSI(14)"
          value={latest.rsi14 !== null ? latest.rsi14.toFixed(1) : "—"}
          hint={rsiHint(latest.rsi14)}
        />
        <Metric
          label="20日动量"
          value={
            latest.momentum20 !== null
              ? `${latest.momentum20 >= 0 ? "+" : ""}${latest.momentum20.toFixed(1)}%`
              : "—"
          }
          tone={
            latest.momentum20 === null
              ? "neutral"
              : latest.momentum20 >= 0
                ? "up"
                : "down"
          }
        />
        <Metric
          label="年化波动"
          value={
            latest.volatility !== null
              ? `${latest.volatility.toFixed(1)}%`
              : "—"
          }
        />
      </div>

      {/* 命中的规则(开发期可见) */}
      {showRules && signal.rules.length > 0 && (
        <div className="mt-6 pt-5 border-t border-ink-800">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-500 mb-2">
            匹配规则
          </div>
          <ul className="text-xs font-mono text-ink-400 space-y-1">
            {signal.rules.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function rsiHint(rsi: number | null): string | undefined {
  if (rsi === null) return undefined;
  if (rsi > 75) return "超买";
  if (rsi < 25) return "超卖";
  if (rsi >= 40 && rsi <= 70) return "健康";
  return "中性";
}

function Metric({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
  hint?: string;
}) {
  const toneClass =
    tone === "up"
      ? "text-up"
      : tone === "down"
        ? "text-down"
        : "text-ink-100";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg ${toneClass}`}>{value}</div>
      {hint && (
        <div className="text-[10px] text-ink-500 mt-0.5">{hint}</div>
      )}
    </div>
  );
}
