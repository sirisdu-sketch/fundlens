"""SQLite 连接管理 + schema 初始化。

设计原则:
- 使用上下文管理器,自动 commit/rollback
- init_db 幂等,可以反复调用
- row_factory 设为 Row,可以按列名访问
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

# 项目根目录:fundlens/fundlens/db.py -> 上两级
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = PROJECT_ROOT / "db" / "market.db"
SCHEMA_PATH = PROJECT_ROOT / "schema.sql"


def init_db(db_path: Path = DEFAULT_DB_PATH) -> None:
    """创建数据库 + 执行 schema。幂等。

    Args:
        db_path: 数据库文件路径。默认 db/market.db。
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(db_path) as conn:
        conn.executescript(schema)
        conn.commit()


@contextmanager
def get_conn(db_path: Path = DEFAULT_DB_PATH) -> Iterator[sqlite3.Connection]:
    """连接上下文管理器。自动 commit / rollback / close。

    Usage:
        with get_conn() as conn:
            conn.execute("INSERT INTO ...")
            # 自动 commit;如果异常会 rollback
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
