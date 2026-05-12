"""数据库层基础测试。

Day 1 下午会新增 test_indicators.py 做指标的核心测试覆盖。
"""

from __future__ import annotations

from pathlib import Path

import pytest

from fundlens.db import get_conn, init_db


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """每个测试用独立 db 文件。"""
    db_file = tmp_path / "test.db"
    init_db(db_file)
    return db_file


def test_init_db_creates_all_tables(temp_db: Path) -> None:
    """schema.sql 里定义的所有表都应该被创建。"""
    with get_conn(temp_db) as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        tables = {r["name"] for r in rows}

    expected = {"instruments", "price_daily", "indicators", "sync_log"}
    missing = expected - tables
    assert not missing, f"Missing tables: {missing}"


def test_init_db_is_idempotent(temp_db: Path) -> None:
    """反复 init_db 不应该报错或丢数据。"""
    with get_conn(temp_db) as conn:
        conn.execute(
            "INSERT INTO instruments (code, name, type) VALUES ('TEST', 'Test Fund', '基金')"
        )

    # 再 init 一次
    init_db(temp_db)

    with get_conn(temp_db) as conn:
        row = conn.execute(
            "SELECT name FROM instruments WHERE code='TEST'"
        ).fetchone()
        assert row is not None
        assert row["name"] == "Test Fund"


def test_price_daily_unique_code_date(temp_db: Path) -> None:
    """UNIQUE(code, date) 约束应该生效。"""
    with get_conn(temp_db) as conn:
        conn.execute(
            "INSERT INTO price_daily (code, date, close) VALUES (?, ?, ?)",
            ("test", "2024-01-01", 1.0),
        )
        # INSERT OR IGNORE 应该静默忽略
        conn.execute(
            "INSERT OR IGNORE INTO price_daily (code, date, close) VALUES (?, ?, ?)",
            ("test", "2024-01-01", 2.0),
        )
        count = conn.execute(
            "SELECT COUNT(*) AS c FROM price_daily WHERE code='test'"
        ).fetchone()["c"]
        assert count == 1, "Duplicate (code, date) should be ignored"


def test_get_conn_rolls_back_on_exception(temp_db: Path) -> None:
    """上下文管理器在异常时应该 rollback。"""
    with pytest.raises(ValueError):
        with get_conn(temp_db) as conn:
            conn.execute(
                "INSERT INTO instruments (code, name, type) VALUES ('X', 'X', '基金')"
            )
            raise ValueError("boom")

    with get_conn(temp_db) as conn:
        row = conn.execute(
            "SELECT * FROM instruments WHERE code='X'"
        ).fetchone()
        assert row is None, "Row should have been rolled back"
