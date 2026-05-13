import { getDb, rangeToStartDate } from "./db";
import type { Fund, IndicatorPoint, PricePoint } from "./types";

/** 所有已同步的基金。 */
export function listFunds(): Fund[] {
  const rows = getDb()
    .prepare(
      `SELECT code, name, type FROM instruments
       WHERE status = 'active'
       ORDER BY code ASC`,
    )
    .all() as Fund[];
  return rows;
}

/** 单只基金详情。 */
export function getFund(code: string): Fund | null {
  const row = getDb()
    .prepare(`SELECT code, name, type FROM instruments WHERE code = ?`)
    .get(code) as Fund | undefined;
  return row ?? null;
}

interface PriceRow {
  date: string;
  close: number;
  adj_close: number;
}

/** 行情序列。range='1m'/'3m'/'6m'/'1y'/'max'。 */
export function getPrices(code: string, range: string): PricePoint[] {
  const startDate = rangeToStartDate(range);
  const db = getDb();
  const rows = startDate
    ? (db
        .prepare(
          `SELECT date, close, adj_close FROM price_daily
           WHERE code = ? AND date >= ?
           ORDER BY date ASC`,
        )
        .all(code, startDate) as PriceRow[])
    : (db
        .prepare(
          `SELECT date, close, adj_close FROM price_daily
           WHERE code = ?
           ORDER BY date ASC`,
        )
        .all(code) as PriceRow[]);

  return rows.map((r) => ({
    date: r.date,
    close: r.close,
    adjClose: r.adj_close,
  }));
}

interface IndicatorRow {
  date: string;
  rsi_14: number | null;
  ma_20: number | null;
  ma_120: number | null;
  ma_250: number | null;
  volatility: number | null;
  momentum_20: number | null;
}

function toIndicatorPoint(r: IndicatorRow): IndicatorPoint {
  return {
    date: r.date,
    rsi14: r.rsi_14,
    ma20: r.ma_20,
    ma120: r.ma_120,
    ma250: r.ma_250,
    volatility: r.volatility,
    momentum20: r.momentum_20,
  };
}

export function getIndicators(code: string, range: string): IndicatorPoint[] {
  const startDate = rangeToStartDate(range);
  const db = getDb();
  const rows = startDate
    ? (db
        .prepare(
          `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
           FROM indicators
           WHERE code = ? AND date >= ?
           ORDER BY date ASC`,
        )
        .all(code, startDate) as IndicatorRow[])
    : (db
        .prepare(
          `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
           FROM indicators
           WHERE code = ?
           ORDER BY date ASC`,
        )
        .all(code) as IndicatorRow[]);

  return rows.map(toIndicatorPoint);
}

/** 最新一行指标(用于详情页 hero 和首页卡片)。 */
export function getLatestIndicator(code: string): IndicatorPoint | null {
  const row = getDb()
    .prepare(
      `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
       FROM indicators
       WHERE code = ?
       ORDER BY date DESC LIMIT 1`,
    )
    .get(code) as IndicatorRow | undefined;
  return row ? toIndicatorPoint(row) : null;
}

/** 最新收盘价。 */
export function getLatestClose(code: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT adj_close FROM price_daily
       WHERE code = ? ORDER BY date DESC LIMIT 1`,
    )
    .get(code) as { adj_close: number } | undefined;
  return row?.adj_close ?? null;
}

/**
 * 计算指定时间窗口的最大回撤(在前端按需算,不存表)。
 * 返回负数,如 -0.18 表示 18% 回撤。
 */
export function computeMaxDrawdown(prices: PricePoint[]): number {
  if (prices.length === 0) return 0;
  let peak = prices[0].adjClose;
  let maxDD = 0;
  for (const p of prices) {
    if (p.adjClose > peak) peak = p.adjClose;
    const dd = (p.adjClose - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}
