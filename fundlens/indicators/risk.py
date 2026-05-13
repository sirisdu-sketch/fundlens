"""风险指标:最大回撤、年化波动率。

注:Sharpe / Calmar 故意延后到 Phase 2 实现。
理由:它们的参考值不好手算(需要无风险利率、年化因子假设),Day 1 下午
价值不大;Phase 2 接 vectorbt 时它内置计算更可靠。
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# 年化常数:A 股一年约 252 个交易日
TRADING_DAYS_PER_YEAR = 252


def max_drawdown(prices: pd.Series) -> float:
    """最大回撤 (Maximum Drawdown)。

    定义为价格序列中"从历史高点跌到后续最低点"的最大跌幅。
    始终返回非正数(0 表示从未回撤,-0.18 表示 18% 回撤)。

    公式:
        cummax(t)   = max(price[0..t])
        drawdown(t) = (price(t) - cummax(t)) / cummax(t)
        max_dd      = min(drawdown)

    Args:
        prices: 价格序列。空序列或全 NaN 返回 0.0。

    Returns:
        最大回撤的小数表示(乘以 100 即为百分比)。

    Example:
        >>> max_drawdown(pd.Series([100, 110, 105, 120, 90, 100, 80]))
        # cummax = [100, 110, 110, 120, 120, 120, 120]
        # drawdown 最深点 = (80-120)/120 = -1/3
        -0.3333333333333333
    """
    clean = prices.dropna()
    if len(clean) == 0:
        return 0.0

    cummax = clean.cummax()
    drawdown = (clean - cummax) / cummax
    return float(drawdown.min())


def annual_volatility(
    prices: pd.Series,
    window: int = 20,
    trading_days: int = TRADING_DAYS_PER_YEAR,
) -> pd.Series:
    """年化波动率(滚动窗口,百分比)。

    公式:
        daily_return = price.pct_change()
        annual_vol   = daily_return.rolling(window).std() * sqrt(trading_days) * 100

    Args:
        prices: 价格序列
        window: 滚动窗口,默认 20(约 1 个月)
        trading_days: 年化因子,默认 252

    Returns:
        与 prices 同长度。前 window 个值为 NaN。单位:百分点(如 18.5 表示 18.5%)。
    """
    if window < 2:
        raise ValueError(f"window must be >= 2, got {window}")
    returns = prices.pct_change()
    return returns.rolling(window).std() * np.sqrt(trading_days) * 100
