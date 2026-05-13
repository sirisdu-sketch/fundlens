"""指标计算模块。

公开 API:
- ma(prices, window): 简单移动平均
- rsi(prices, period): 相对强弱指数(基于 SMA 而非 Wilder EMA,便于手算验证)
- max_drawdown(prices): 最大回撤(返回负数,如 -0.18 表示 18%)
- annual_volatility(prices, window): 年化波动率(%)
- momentum(prices, period): N 日动量(%)

设计原则:
- 所有函数输入 pd.Series(adj_close),输出 pd.Series 或 float
- 不做副作用(不读 db、不写 db),纯函数,易测试
- NaN 透传不抛错,调用方负责处理
"""

from .momentum import momentum, rsi
from .risk import annual_volatility, max_drawdown
from .trend import ma

__all__ = [
    "ma",
    "rsi",
    "max_drawdown",
    "annual_volatility",
    "momentum",
]
