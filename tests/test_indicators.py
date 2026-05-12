"""指标层测试。

设计原则:
- 所有参考值都用最简短的序列,可纸笔验证
- 测试注释里写出手算过程,使测试本身成为活文档
- 每个指标覆盖:正常计算、边界情况、错误参数

简历视角:
- 9 个测试用例,3 个指标 × 3 个角度(正常 / 边界 / 错误输入)
- 所有参考值含手算注释,可独立验证
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from fundlens.indicators import ma, max_drawdown, rsi


# ============================================================
# MA (Moving Average) - 3 tests
# ============================================================

class TestMA:
    """简单移动平均线测试。"""

    def test_ma_basic_calculation(self) -> None:
        """基本计算验证。

        Series: [10, 20, 30, 40, 50], window=3
        手算:
            index 2: (10+20+30)/3 = 20
            index 3: (20+30+40)/3 = 30
            index 4: (30+40+50)/3 = 40
        """
        prices = pd.Series([10, 20, 30, 40, 50], dtype=float)
        result = ma(prices, window=3)

        # 前 (window-1)=2 个是 NaN
        assert math.isnan(result.iloc[0])
        assert math.isnan(result.iloc[1])
        # 有效值
        assert result.iloc[2] == pytest.approx(20.0)
        assert result.iloc[3] == pytest.approx(30.0)
        assert result.iloc[4] == pytest.approx(40.0)

    def test_ma_returns_nan_before_window_filled(self) -> None:
        """window 比数据长时,全部返回 NaN。"""
        prices = pd.Series([1, 2, 3], dtype=float)
        result = ma(prices, window=10)
        assert result.isna().all(), "All values should be NaN when window > len"
        assert len(result) == len(prices), "Length must match input"

    def test_ma_invalid_window_raises(self) -> None:
        """window <= 0 应该抛 ValueError。"""
        prices = pd.Series([1.0, 2.0, 3.0])
        with pytest.raises(ValueError, match="window must be >= 1"):
            ma(prices, window=0)


# ============================================================
# RSI - 3 tests
# ============================================================

class TestRSI:
    """RSI 测试。基于 SMA 版本,便于手算。"""

    def test_rsi_all_up_returns_100(self) -> None:
        """全部上涨 → RSI = 100。

        当 period 个连续上涨,loss 的滚动均值 = 0,
        RS = gain/0 = inf,RSI = 100 - 100/inf = 100。
        """
        prices = pd.Series([10, 11, 12, 13, 14, 15, 16], dtype=float)
        result = rsi(prices, period=3)
        # 前 3 个 NaN(diff 损失 1 + rolling 损失 2)
        # 第 4 个起应全是 100
        valid = result.dropna()
        assert (valid == 100.0).all(), f"Expected all 100, got {valid.tolist()}"
        assert len(valid) == 4

    def test_rsi_all_down_returns_0(self) -> None:
        """全部下跌 → RSI = 0。

        gain = 0,RS = 0,RSI = 100 - 100/1 = 0。
        """
        prices = pd.Series([16, 15, 14, 13, 12, 11, 10], dtype=float)
        result = rsi(prices, period=3)
        valid = result.dropna()
        assert (valid == 0.0).all(), f"Expected all 0, got {valid.tolist()}"

    def test_rsi_mixed_matches_hand_calculation(self) -> None:
        """涨跌混合序列,逐点对比手算值。

        Series: [10, 11, 12, 11, 10, 11, 12, 13, 14], period=3

        delta = [_, 1, 1, -1, -1, 1, 1, 1, 1]
        gain  = [_, 1, 1,  0,  0, 1, 1, 1, 1]
        loss  = [_, 0, 0,  1,  1, 0, 0, 0, 0]

        rolling(3).mean() 在 index=2 时 window 含 NaN → NaN

        index=3: gain_avg=(1+1+0)/3=2/3, loss_avg=(0+0+1)/3=1/3
                 RS = 2, RSI = 100 - 100/3 = 66.667
        index=4: gain_avg=(1+0+0)/3=1/3, loss_avg=(0+1+1)/3=2/3
                 RS = 0.5, RSI = 100 - 100/1.5 = 33.333
        index=5: gain_avg=(0+0+1)/3=1/3, loss_avg=(1+1+0)/3=2/3
                 RS = 0.5, RSI = 33.333
        index=6: gain_avg=(0+1+1)/3=2/3, loss_avg=(1+0+0)/3=1/3
                 RS = 2, RSI = 66.667
        index=7,8: gain_avg=1, loss_avg=0 → RSI=100
        """
        prices = pd.Series(
            [10, 11, 12, 11, 10, 11, 12, 13, 14], dtype=float
        )
        result = rsi(prices, period=3)

        expected = [
            None, None, None,   # 前 3 个 NaN
            200 / 3,            # 66.667
            100 / 3,            # 33.333
            100 / 3,            # 33.333
            200 / 3,            # 66.667
            100.0,
            100.0,
        ]

        for i, exp in enumerate(expected):
            if exp is None:
                assert math.isnan(result.iloc[i]), f"index {i}: expected NaN"
            else:
                assert result.iloc[i] == pytest.approx(exp, abs=1e-4), (
                    f"index {i}: expected {exp}, got {result.iloc[i]}"
                )


# ============================================================
# Max Drawdown - 3 tests
# ============================================================

class TestMaxDrawdown:
    """最大回撤测试。"""

    def test_max_drawdown_classic_example(self) -> None:
        """经典教科书例子。

        prices: [100, 110, 105, 120, 90, 100, 80]
        cummax: [100, 110, 110, 120, 120, 120, 120]
        从历史最高点 120 跌到 80,回撤 = (80-120)/120 = -1/3 ≈ -33.33%
        """
        prices = pd.Series([100, 110, 105, 120, 90, 100, 80], dtype=float)
        result = max_drawdown(prices)
        assert result == pytest.approx(-1 / 3, abs=1e-9)

    def test_max_drawdown_monotonic_up_is_zero(self) -> None:
        """单调上涨 → 最大回撤 = 0(每个点都是新高,无任何回撤)。"""
        prices = pd.Series([1, 2, 3, 4, 5, 100, 200], dtype=float)
        result = max_drawdown(prices)
        assert result == 0.0

    def test_max_drawdown_handles_empty_and_nan(self) -> None:
        """边界条件:空序列和全 NaN 都返回 0.0(无数据 → 无回撤)。"""
        # 空序列
        assert max_drawdown(pd.Series([], dtype=float)) == 0.0
        # 全 NaN
        assert max_drawdown(pd.Series([np.nan, np.nan, np.nan])) == 0.0
        # 只有一个值(无法回撤)
        assert max_drawdown(pd.Series([100.0])) == 0.0
