import type { IndicatorPoint, PricePoint, Signal } from "./types";

/**
 * 基于最新一行指标 + 最近价格,生成"操作建议"。
 *
 * 规则集(从严格到宽松,匹配到的第一条胜出):
 *
 *  1. RSI > 75                     → 观察 (短期超买,等回调)
 *  2. RSI < 25 且 价格 > MA250     → 轻仓 (长期向上中的短期超卖,黄金坑)
 *  3. 价格 < MA250 且 动量20 < -10 → 回避 (跌破长期均线且加速下行)
 *  4. MA20 > MA120 且 RSI∈[40,70] → 持有 (多头排列,健康上涨)
 *  5. 默认                         → 观察 (无强信号)
 *
 * 这些规则故意保守:技术指标只提示位置,不预测方向。
 * 这里的目标是过滤掉"明显不该买/明显不该追"的情况,而不是择时。
 */
export function generateSignal(
  latest: IndicatorPoint,
  recentPrice: number,
): Signal {
  const { rsi14, ma20, ma120, ma250, momentum20 } = latest;
  const matched: string[] = [];

  // 规则 1:超买
  if (rsi14 !== null && rsi14 > 75) {
    matched.push(`RSI(14)=${rsi14.toFixed(1)} > 75`);
    return {
      level: "watch",
      label: "观察",
      reason: "短期超买区,等待回调更稳",
      rules: matched,
    };
  }

  // 规则 2:超卖+长期向上
  if (rsi14 !== null && rsi14 < 25 && ma250 !== null && recentPrice > ma250) {
    matched.push(`RSI(14)=${rsi14.toFixed(1)} < 25`);
    matched.push(`价格 > MA250(长期趋势向上)`);
    return {
      level: "buy",
      label: "轻仓",
      reason: "长期趋势向上,短期超卖,可分批介入",
      rules: matched,
    };
  }

  // 规则 3:破长期均线且加速下行
  if (
    ma250 !== null &&
    momentum20 !== null &&
    recentPrice < ma250 &&
    momentum20 < -10
  ) {
    matched.push(`价格 < MA250`);
    matched.push(`20日动量=${momentum20.toFixed(1)}% < -10%`);
    return {
      level: "avoid",
      label: "回避",
      reason: "跌破长期均线且加速下行,等趋势企稳",
      rules: matched,
    };
  }

  // 规则 4:健康多头
  if (
    ma20 !== null &&
    ma120 !== null &&
    ma20 > ma120 &&
    rsi14 !== null &&
    rsi14 >= 40 &&
    rsi14 <= 70
  ) {
    matched.push(`MA20 > MA120(多头排列)`);
    matched.push(`RSI(14)=${rsi14.toFixed(1)} ∈ [40,70](健康区间)`);
    return {
      level: "hold",
      label: "持有",
      reason: "多头排列且 RSI 在健康区间,可持有",
      rules: matched,
    };
  }

  // 规则 5:默认
  return {
    level: "watch",
    label: "观察",
    reason: "暂无强信号,继续观察",
    rules: ["未命中任何明确规则"],
  };
}

/** 信号等级 → Tailwind 颜色 token(供组件用)。 */
export function signalColor(level: Signal["level"]): {
  text: string;
  border: string;
  bg: string;
} {
  switch (level) {
    case "buy":
      return { text: "text-up", border: "border-up/40", bg: "bg-up/10" };
    case "hold":
      return {
        text: "text-amber",
        border: "border-amber/40",
        bg: "bg-amber/10",
      };
    case "watch":
      return {
        text: "text-ink-300",
        border: "border-ink-600",
        bg: "bg-ink-800/50",
      };
    case "avoid":
      return { text: "text-down", border: "border-down/40", bg: "bg-down/10" };
  }
}
