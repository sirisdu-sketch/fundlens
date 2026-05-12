"""同步入口 CLI。

运行:
    python -m fundlens.sync           # 同步 codes.py 里所有基金
    python -m fundlens.sync 161725    # 同步单个基金

行为:
- 先 init_db 保证表存在
- 逐个拉取基金净值,失败的继续下一只(不中断)
- 用 INSERT OR IGNORE 实现幂等,重复运行不会插入重复数据
- 最后打印汇总,失败列表非空时返回非零退出码
"""

from __future__ import annotations

import logging
import sys
import time

import pandas as pd

from fundlens.codes import WATCHED_FUNDS
from fundlens.db import DEFAULT_DB_PATH, get_conn, init_db
from fundlens.fetcher import fetch_fund_name, fetch_fund_nav

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fundlens.sync")


def upsert_instrument(conn, code: str, name: str) -> None:
    """更新或插入基金元信息。"""
    conn.execute(
        """
        INSERT INTO instruments (code, name, type, market, status, updated_at)
        VALUES (?, ?, '基金', 'CN', 'active', ?)
        ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            updated_at = excluded.updated_at
        """,
        (code, name, int(time.time())),
    )


def upsert_prices(conn, code: str, df: pd.DataFrame) -> int:
    """批量插入行情。返回实际新增行数(已存在的会被 IGNORE)。"""
    rows = [
        (
            code,
            row["date"],
            None, None, None,  # open/high/low - 基金没有
            float(row["close"]),
            None, None,        # volume/amount
            float(row["adj_close"]),
        )
        for _, row in df.iterrows()
    ]
    cur = conn.executemany(
        """
        INSERT OR IGNORE INTO price_daily
            (code, date, open, high, low, close, volume, amount, adj_close)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return cur.rowcount


def update_sync_log(conn, code: str, last_date: str) -> None:
    """记录同步状态。"""
    conn.execute(
        """
        INSERT INTO sync_log (code, data_type, last_date, synced_at)
        VALUES (?, 'prices', ?, ?)
        ON CONFLICT(code, data_type) DO UPDATE SET
            last_date = excluded.last_date,
            synced_at = excluded.synced_at
        """,
        (code, last_date, int(time.time())),
    )


def sync_fund(code: str) -> dict[str, object]:
    """同步单只基金。返回汇总信息。"""
    logger.info("Syncing fund %s...", code)
    name = fetch_fund_name(code)
    df = fetch_fund_nav(code)

    with get_conn() as conn:
        upsert_instrument(conn, code, name)
        inserted = upsert_prices(conn, code, df)
        last_date = str(df["date"].iloc[-1])
        update_sync_log(conn, code, last_date)

    return {
        "code": code,
        "name": name,
        "rows": len(df),
        "inserted": inserted,
        "last_date": last_date,
    }


def main() -> int:
    """主入口。返回 exit code:0=全部成功,1=有失败。"""
    # 解析参数:无参 = 同步所有;有参 = 同步指定的
    codes = sys.argv[1:] if len(sys.argv) > 1 else WATCHED_FUNDS

    init_db()
    logger.info("Database ready at %s", DEFAULT_DB_PATH)
    logger.info("Syncing %d fund(s)...", len(codes))

    results: list[dict[str, object]] = []
    failures: list[tuple[str, str]] = []

    for code in codes:
        try:
            res = sync_fund(code)
            results.append(res)
            logger.info(
                "  OK  %s (%s): %d rows total, %d new, last %s",
                res["code"], res["name"], res["rows"], res["inserted"], res["last_date"],
            )
        except Exception as e:
            failures.append((code, str(e)))
            logger.error("  FAIL %s: %s", code, e)

    logger.info("=" * 60)
    logger.info("Summary: %d succeeded, %d failed", len(results), len(failures))
    if failures:
        for code, msg in failures:
            logger.error("  - %s: %s", code, msg)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
