"""趋势指标:移动平均线。"""

from __future__ import annotations

import pandas as pd


def ma(prices: pd.Series, window: int) -> pd.Series:
    """简单移动平均线 (Simple Moving Average)。

    Args:
        prices: 价格序列(通常用 adj_close)
        window: 窗口期(如 20、60、120、250)

    Returns:
        与 prices 同长度的 Series。前 (window-1) 个值为 NaN。

    Example:
        >>> ma(pd.Series([1, 2, 3, 4, 5]), window=3).tolist()
        [nan, nan, 2.0, 3.0, 4.0]
    """
    if window < 1:
        raise ValueError(f"window must be >= 1, got {window}")
    return prices.rolling(window).mean()
