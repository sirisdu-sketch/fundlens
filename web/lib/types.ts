// 数据库行的类型定义。
// 注意:better-sqlite3 返回 snake_case,我们在 API 层转 camelCase。

export interface Fund {
  code: string;
  name: string;
  type: string;
}

export interface PricePoint {
  date: string;    // YYYY-MM-DD
  close: number;
  adjClose: number;
}

export interface IndicatorPoint {
  date: string;
  rsi14: number | null;
  ma20: number | null;
  ma120: number | null;
  ma250: number | null;
  volatility: number | null;
  momentum20: number | null;
}

export type SignalLevel = "buy" | "hold" | "watch" | "avoid";

export interface Signal {
  level: SignalLevel;
  label: string;        // 中文标签:轻仓 / 持有 / 观察 / 回避
  reason: string;       // 一句话理由(给家人看)
  rules: string[];      // 命中的具体规则(给我自己看)
}

export type TimeRange = "1m" | "3m" | "6m" | "1y" | "max";
