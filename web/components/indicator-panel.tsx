import type { IndicatorPoint } from "@/lib/types";

interface Props {
  latest: IndicatorPoint;
  close: number;
  maxDrawdown1y: number;
}

export function IndicatorPanel({ latest, close, maxDrawdown1y }: Props) {
  const items = [
    {
      label: "RSI(14)",
      value: latest.rsi14,
      format: (v: number) => v.toFixed(1),
      desc: rsiDescription(latest.rsi14),
    },
    {
      label: "MA20",
      value: latest.ma20,
      format: (v: number) => v.toFixed(4),
      desc: maRelation(close, latest.ma20, "20日均"),
    },
    {
      label: "MA120",
      value: latest.ma120,
      format: (v: number) => v.toFixed(4),
      desc: maRelation(close, latest.ma120, "120日均"),
    },
    {
      label: "MA250",
      value: latest.ma250,
      format: (v: number) => v.toFixed(4),
      desc: maRelation(close, latest.ma250, "250日均"),
    },
    {
      label: "年化波动率",
      value: latest.volatility,
      format: (v: number) => `${v.toFixed(1)}%`,
      desc: volDescription(latest.volatility),
    },
    {
      label: "20日动量",
      value: latest.momentum20,
      format: (v: number) =>
        `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
      desc: momentumDescription(latest.momentum20),
    },
  ];

  return (
    <div>
      <h2 className="display text-2xl text-ink-100 mb-5">技术指标</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border border-ink-800 bg-ink-900/60 p-4"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
              {it.label}
            </div>
            <div className="mt-1.5 font-mono text-xl text-ink-100">
              {it.value !== null ? it.format(it.value) : "—"}
            </div>
            {it.desc && (
              <div className="mt-1 text-xs text-ink-400">{it.desc}</div>
            )}
          </div>
        ))}

        {/* 最大回撤 — 单独一块,因为是区间统计量 */}
        <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">
            最大回撤(近1年)
          </div>
          <div className="mt-1.5 font-mono text-xl text-down">
            {(maxDrawdown1y * 100).toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-ink-400">
            历史峰值到谷底的最大跌幅
          </div>
        </div>
      </div>
    </div>
  );
}

function rsiDescription(rsi: number | null): string {
  if (rsi === null) return "";
  if (rsi > 75) return "超买区";
  if (rsi < 25) return "超卖区";
  if (rsi > 70) return "偏高";
  if (rsi < 30) return "偏低";
  return "健康区间";
}

function maRelation(close: number, ma: number | null, name: string): string {
  if (ma === null) return "数据不足";
  const diff = ((close - ma) / ma) * 100;
  const dir = diff >= 0 ? "上方" : "下方";
  return `价格在${name}${dir} ${Math.abs(diff).toFixed(1)}%`;
}

function volDescription(vol: number | null): string {
  if (vol === null) return "";
  if (vol > 30) return "高波动";
  if (vol > 20) return "中等波动";
  return "低波动";
}

function momentumDescription(mom: number | null): string {
  if (mom === null) return "";
  if (mom > 10) return "强势上行";
  if (mom > 0) return "温和上行";
  if (mom > -10) return "温和下行";
  return "加速下行";
}
