"""指标批量计算入口 CLI。

用法:
    python -m fundlens.compute              # 算所有已同步的基金
    python -m fundlens.compute 161725       # 算单个

流程:
    1. 从 price_daily 读取每只基金的全部 adj_close
    2. 计算 5 个指标:RSI(14)、MA(20/120/250)、年化波动率(20)、动量(20)
    3. INSERT OR REPLACE 到 indicators 表

设计:
    - 全量重算,不做增量。Day 1 数据量小(5 只基金 × 几千行),
      重算 < 1 秒,简单可靠。Phase 2 数据量大时再加 only_new=True。
    - 指标函数是纯函数(在 indicators/ 包里),本文件只做 I/O。
"""

from __future__ import annotations

import logging
import sys

import pandas as pd

from fundlens.codes import WATCHED_FUNDS
from fundlens.db import get_conn, init_db
from fundlens.indicators import annual_volatility, ma, momentum, rsi

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fundlens.compute")


def load_prices(conn, code: str) -> pd.DataFrame:
    """从 price_daily 读取一只基金的全部行情,按日期升序。"""
    df = pd.read_sql(
        "SELECT date, adj_close FROM price_daily "
        "WHERE code = ? ORDER BY date ASC",
        conn,
        params=(code,),
    )
    return df


def compute_indicators(prices: pd.Series) -> pd.DataFrame:
    """对一个价格序列计算所有指标。返回宽表 DataFrame(列=各指标)。

    注:输入是 pd.Series(adj_close),按日期升序排列。
    """
    return pd.DataFrame({
        "rsi_14": rsi(prices, period=14),
        "ma_20": ma(prices, window=20),
        "ma_120": ma(prices, window=120),
        "ma_250": ma(prices, window=250),
        "volatility": annual_volatility(prices, window=20),
        "momentum_20": momentum(prices, period=20),
    })


def write_indicators(conn, code: str, dates: pd.Series, ind: pd.DataFrame) -> int:
    """把指标写入 indicators 表。INSERT OR REPLACE,可重复运行。"""
    rows = []
    for i in range(len(ind)):
        row = ind.iloc[i]
        # 把 NaN 转成 None(SQLite NULL)
        rows.append((
            code,
            dates.iloc[i],
            None if pd.isna(row["rsi_14"]) else float(row["rsi_14"]),
            None if pd.isna(row["ma_20"]) else float(row["ma_20"]),
            None if pd.isna(row["ma_120"]) else float(row["ma_120"]),
            None if pd.isna(row["ma_250"]) else float(row["ma_250"]),
            None if pd.isna(row["volatility"]) else float(row["volatility"]),
            None if pd.isna(row["momentum_20"]) else float(row["momentum_20"]),
        ))
    cur = conn.executemany(
        """
        INSERT OR REPLACE INTO indicators
            (code, date, rsi_14, ma_20, ma_120, ma_250, volatility, momentum_20)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return cur.rowcount


def compute_one(code: str) -> dict[str, object]:
    """计算一只基金的指标。"""
    with get_conn() as conn:
        df = load_prices(conn, code)
        if df.empty:
            return {"code": code, "rows": 0, "skipped": "no price data"}

        prices = df["adj_close"].astype(float)
        ind = compute_indicators(prices)
        n = write_indicators(conn, code, df["date"], ind)

        # 取最新一行非 NaN 的 RSI 做日志展示
        latest_rsi = ind["rsi_14"].dropna()
        latest_rsi_val = float(latest_rsi.iloc[-1]) if len(latest_rsi) > 0 else None

    return {
        "code": code,
        "rows": n,
        "latest_rsi": latest_rsi_val,
    }


def main() -> int:
    codes = sys.argv[1:] if len(sys.argv) > 1 else WATCHED_FUNDS

    init_db()
    logger.info("Computing indicators for %d fund(s)...", len(codes))

    failures: list[tuple[str, str]] = []
    for code in codes:
        try:
            r = compute_one(code)
            if "skipped" in r:
                logger.warning("  SKIP %s: %s", code, r["skipped"])
            else:
                rsi_str = (
                    f"{r['latest_rsi']:.1f}" if r['latest_rsi'] is not None else "n/a"
                )
                logger.info(
                    "  OK   %s: %d rows written, latest RSI(14)=%s",
                    code, r["rows"], rsi_str,
                )
        except Exception as e:
            failures.append((code, str(e)))
            logger.error("  FAIL %s: %s", code, e)

    logger.info("=" * 60)
    logger.info("Done. %d succeeded, %d failed", len(codes) - len(failures), len(failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
