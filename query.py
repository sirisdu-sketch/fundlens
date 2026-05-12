"""快速查询关注基金的最新指标快照。用法: python query.py"""

import sys
import sqlite3
from pathlib import Path

# Windows 下强制 stdout 用 UTF-8,避免中文乱码
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DB = Path(__file__).parent / "db" / "market.db"


def width(s: str) -> int:
    return sum(2 if ord(c) > 127 else 1 for c in s)


def ljust_cn(s: str, w: int) -> str:
    return s + " " * max(w - width(s), 0)


def main() -> None:
    if not DB.exists():
        print(f"❌ {DB} 不存在,先跑: python -m fundlens.sync")
        return

    with sqlite3.connect(DB) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT i.code, ins.name, i.date,
                   ROUND(i.rsi_14, 1)      AS rsi,
                   ROUND(i.ma_20, 4)       AS ma20,
                   ROUND(i.volatility, 1)  AS vol,
                   ROUND(i.momentum_20, 1) AS mom20
            FROM indicators i
            JOIN instruments ins ON ins.code = i.code
            JOIN (
                SELECT code, MAX(date) AS max_date
                FROM indicators
                WHERE rsi_14 IS NOT NULL
                GROUP BY code
            ) m ON m.code = i.code AND m.max_date = i.date
            ORDER BY i.rsi_14 DESC
        """).fetchall()

    if not rows:
        print("⚠️ indicators 表为空,先跑: python -m fundlens.compute")
        return

    headers = ["代码", "基金简称", "日期", "RSI(14)", "MA20", "波动率%", "动量%"]
    widths = [8, 24, 12, 8, 10, 9, 8]
    header_line = "  ".join(ljust_cn(h, w) for h, w in zip(headers, widths))
    print()
    print(header_line)
    print("-" * width(header_line))

    for r in rows:
        cells = [
            r["code"],
            (r["name"] or "")[:12],
            r["date"],
            f"{r['rsi']:.1f}" if r['rsi'] is not None else "n/a",
            f"{r['ma20']:.4f}" if r['ma20'] is not None else "n/a",
            f"{r['vol']:.1f}" if r['vol'] is not None else "n/a",
            f"{r['mom20']:+.1f}" if r['mom20'] is not None else "n/a",
        ]
        print("  ".join(ljust_cn(c, w) for c, w in zip(cells, widths)))
    print()


if __name__ == "__main__":
    main()
