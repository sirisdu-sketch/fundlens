"""动量指标:RSI、N 日动量。"""

from __future__ import annotations

import numpy as np
import pandas as pd


def rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """相对强弱指数 (Relative Strength Index)。

    采用 SMA(简单移动平均)而非 Wilder 平滑,理由:
    1. 便于手算验证 → 测试参考值清晰
    2. 与 Wilder 版本数值差异小,且许多教科书示例用 SMA 版

    公式:
        delta = price.diff()
        gain  = max(delta, 0).rolling(period).mean()
        loss  = max(-delta, 0).rolling(period).mean()
        RS    = gain / loss
        RSI   = 100 - 100 / (1 + RS)

    边界:
        - loss = 0 且 gain > 0 → RS = inf → RSI = 100(全涨)
        - loss > 0 且 gain = 0 → RS = 0   → RSI = 0  (全跌)
        - loss = 0 且 gain = 0 → RS = nan → RSI = NaN(完全平盘,无信号)

    Args:
        prices: 价格序列
        period: 回看窗口,默认 14

    Returns:
        与 prices 同长度。前 period 个值为 NaN(diff 损失 1 个 + rolling 损失 period-1 个)。
    """
    if period < 1:
        raise ValueError(f"period must be >= 1, got {period}")

    delta = prices.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()

    # gain/0 = inf,pandas/numpy 默认行为,后续 100 - 100/(1+inf) = 100,自然处理
    # gain=loss=0(完全平盘): 0/0 = NaN,继续 NaN,符合预期(无信号)
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def momentum(prices: pd.Series, period: int = 20) -> pd.Series:
    """N 日动量 (Rate of Change)。

    定义为 N 日前的累计涨跌幅(%)。

    公式:
        momentum(t) = (price(t) / price(t-N) - 1) * 100

    Args:
        prices: 价格序列
        period: 回看天数,默认 20(约 1 个月交易日)

    Returns:
        与 prices 同长度。前 period 个值为 NaN。
    """
    if period < 1:
        raise ValueError(f"period must be >= 1, got {period}")
    return prices.pct_change(period) * 100
