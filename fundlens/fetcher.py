"""AKShare 数据获取封装。

提供:
- 漏桶限速(100ms 间隔,避免触发反爬)
- 指数退避重试(3次)
- 统一的数据格式输出(DataFrame: date, close, adj_close)

对开放式基金:
- 用累计净值(adj_close),已含分红再投资,适合做指标计算
- AKShare 不返回 OHLC,基金没有日内波动概念,close = adj_close
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

import akshare as ak
import pandas as pd

logger = logging.getLogger(__name__)

# 漏桶限速:全局共享上次请求时间
_last_call_ts: float = 0.0
MIN_INTERVAL_SECONDS = 0.1  # 100ms


def _throttle() -> None:
    """漏桶限速:保证两次请求之间至少 MIN_INTERVAL_SECONDS。"""
    global _last_call_ts
    elapsed = time.time() - _last_call_ts
    if elapsed < MIN_INTERVAL_SECONDS:
        time.sleep(MIN_INTERVAL_SECONDS - elapsed)
    _last_call_ts = time.time()


def _retry(fn: Callable[..., Any], *args: Any, max_attempts: int = 3, **kwargs: Any) -> Any:
    """指数退避重试。1s -> 2s -> 4s。

    Raises:
        RuntimeError: 所有重试都失败后抛出,链式包装原始异常。
    """
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            _throttle()
            return fn(*args, **kwargs)
        except Exception as e:
            last_exc = e
            if attempt == max_attempts:
                break
            wait = 2 ** (attempt - 1)
            logger.warning(
                "Attempt %d/%d failed: %s. Retrying in %ds...",
                attempt, max_attempts, e, wait,
            )
            time.sleep(wait)
    raise RuntimeError(
        f"All {max_attempts} attempts failed for {fn.__name__}"
    ) from last_exc


def fetch_fund_nav(code: str) -> pd.DataFrame:
    """拉取开放式基金的累计净值历史。

    Args:
        code: 6位基金代码,例如 "161725"

    Returns:
        DataFrame with columns: date(str YYYY-MM-DD), close(float), adj_close(float)
        按 date 升序排列。

    Raises:
        ValueError: AKShare 返回空数据
        RuntimeError: 重试 3 次仍失败
    """
    df = _retry(
        ak.fund_open_fund_info_em,
        symbol=code,
        indicator="累计净值走势",
    )
    if df is None or df.empty:
        raise ValueError(f"No data returned for fund {code}")

    # AKShare 返回的列名:净值日期、累计净值
    df = df.rename(columns={
        "净值日期": "date",
        "累计净值": "adj_close",
    })
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["adj_close"] = df["adj_close"].astype(float)
    df["close"] = df["adj_close"]  # 基金没有 OHLC,close = 累计净值
    df = df[["date", "close", "adj_close"]].sort_values("date").reset_index(drop=True)

    # 数据校验
    if df["adj_close"].isna().any():
        n_na = int(df["adj_close"].isna().sum())
        logger.warning("Fund %s has %d NaN values in adj_close", code, n_na)
        df = df.dropna(subset=["adj_close"]).reset_index(drop=True)

    return df


def fetch_fund_name(code: str) -> str:
    """获取基金简称。失败时返回 fallback 字符串,不阻塞主流程。"""
    try:
        df = _retry(ak.fund_name_em)
        match = df[df["基金代码"] == code]
        if not match.empty:
            return str(match.iloc[0]["基金简称"])
    except Exception as e:
        logger.warning("Failed to fetch name for %s: %s", code, e)
    return f"Fund {code}"
