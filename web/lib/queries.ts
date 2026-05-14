import { getDb, rangeToStartDate } from "./db";
import type { Fund, IndicatorPoint, PricePoint } from "./types";

export async function listFunds(): Promise<Fund[]> {
  const result = await getDb().execute(
    `SELECT code, name, type FROM instruments WHERE status = 'active' ORDER BY code ASC`,
  );
  return result.rows.map((r) => ({
    code: r.code as string,
    name: r.name as string,
    type: r.type as string,
  }));
}

export async function getFund(code: string): Promise<Fund | null> {
  const result = await getDb().execute({
    sql: `SELECT code, name, type FROM instruments WHERE code = ?`,
    args: [code],
  });
  const r = result.rows[0];
  if (!r) return null;
  return { code: r.code as string, name: r.name as string, type: r.type as string };
}

export async function getPrices(code: string, range: string): Promise<PricePoint[]> {
  const startDate = rangeToStartDate(range);
  const result = startDate
    ? await getDb().execute({
        sql: `SELECT date, close, adj_close FROM price_daily
              WHERE code = ? AND date >= ? ORDER BY date ASC`,
        args: [code, startDate],
      })
    : await getDb().execute({
        sql: `SELECT date, close, adj_close FROM price_daily
              WHERE code = ? ORDER BY date ASC`,
        args: [code],
      });
  return result.rows.map((r) => ({
    date: r.date as string,
    close: r.close as number,
    adjClose: r.adj_close as number,
  }));
}

function toIndicatorPoint(r: Record<string, unknown>): IndicatorPoint {
  return {
    date: r.date as string,
    rsi14: r.rsi_14 != null ? Number(r.rsi_14) : null,
    ma20: r.ma_20 != null ? Number(r.ma_20) : null,
    ma120: r.ma_120 != null ? Number(r.ma_120) : null,
    ma250: r.ma_250 != null ? Number(r.ma_250) : null,
    volatility: r.volatility != null ? Number(r.volatility) : null,
    momentum20: r.momentum_20 != null ? Number(r.momentum_20) : null,
  };
}

export async function getIndicators(
  code: string,
  range: string,
): Promise<IndicatorPoint[]> {
  const startDate = rangeToStartDate(range);
  const result = startDate
    ? await getDb().execute({
        sql: `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
              FROM indicators WHERE code = ? AND date >= ? ORDER BY date ASC`,
        args: [code, startDate],
      })
    : await getDb().execute({
        sql: `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
              FROM indicators WHERE code = ? ORDER BY date ASC`,
        args: [code],
      });
  return result.rows.map((r) => toIndicatorPoint(r as Record<string, unknown>));
}

export async function getLatestIndicator(code: string): Promise<IndicatorPoint | null> {
  const result = await getDb().execute({
    sql: `SELECT date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20
          FROM indicators WHERE code = ? ORDER BY date DESC LIMIT 1`,
    args: [code],
  });
  const r = result.rows[0];
  return r ? toIndicatorPoint(r as Record<string, unknown>) : null;
}

export async function getLatestClose(code: string): Promise<number | null> {
  const result = await getDb().execute({
    sql: `SELECT adj_close FROM price_daily WHERE code = ? ORDER BY date DESC LIMIT 1`,
    args: [code],
  });
  const r = result.rows[0];
  return r != null ? Number(r.adj_close) : null;
}

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
