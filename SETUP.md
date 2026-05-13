# Day 1 — 上手指南

完整 Day 1 流程预计 1-2 小时(含等数据)。

---

## Day 1 上午 ✅(你已经搞定)

数据层 + AKShare 摄取 + 4 个 db 测试。

---

## Day 1 下午 — 指标层

### 1. 解压覆盖

把新 zip 解压,覆盖原 `fundlens/` 项目目录。新增/修改:

- `fundlens/indicators/`(新增,3 个文件 + `__init__.py`)
- `fundlens/compute.py`(新增,批量计算入口)
- `tests/test_indicators.py`(新增,9 个测试)

### 2. 跑测试 — 先确认指标正确

```bash
pytest -v
```

应该看到 **13 个测试全过**(4 个 db + 9 个 indicators)。

> **简历亮点**:每个指标测试都有手算注释。比如 `test_rsi_mixed_matches_hand_calculation`
> 的 docstring 写明了 delta/gain/loss/RS/RSI 每一步如何算出 66.67 / 33.33 / 100。
> 面试官能看出"这个人理解指标的数学,而不是调了个库"。

### 3. 计算指标并写库

```bash
python -m fundlens.compute
```

预期输出:
```
[INFO] Computing indicators for 5 fund(s)...
[INFO]   OK   161725: 1234 rows written, latest RSI(14)=42.3
[INFO]   OK   019547: 567 rows written, latest RSI(14)=58.1
...
```

`compute` 是**全量重算**,每次都把所有日期的指标重写一遍。Day 1 数据量小
(5 只 × 几千行),不到 1 秒。Phase 2 数据量大时再加增量。

### 4. 验证 indicators 表

```bash
sqlite3 db/market.db "
SELECT code, date,
       ROUND(rsi_14, 1)      AS rsi,
       ROUND(ma_20, 4)       AS ma20,
       ROUND(volatility, 1)  AS vol,
       ROUND(momentum_20, 1) AS mom20
FROM indicators
WHERE date = (SELECT MAX(date) FROM indicators)
ORDER BY rsi DESC;
"
```

这一条 SQL 已经能告诉你**今天哪只基金技术面最强**(RSI 高 + 在均线上方 + 动量为正)。

### 5. Commit

```bash
git add .
git commit -m "feat: indicators module (RSI/MA/MaxDD) with 9 unit tests"
```

---

## Day 1 完成清单

| 已完成 | 文件 |
|---|---|
| 标准 Python 包 | `pyproject.toml` |
| SQLite schema 4 张表 | `schema.sql` |
| AKShare 限速重试封装 | `fundlens/fetcher.py` |
| 数据同步 CLI | `fundlens/sync.py` |
| 5 个指标实现 | `fundlens/indicators/` |
| 指标批量计算 CLI | `fundlens/compute.py` |
| **13 个 pytest 测试,手算 + 边界双覆盖** | `tests/` |

**两条命令的完整流水线**:
```bash
python -m fundlens.sync       # 拉数据
python -m fundlens.compute    # 算指标
```

跑通后跟我说"Day 1 全部搞定",我出 Day 2 的代码
(Next.js + lightweight-charts + 详情页 + 操作建议卡片)。

---

## 卡住怎么办

| 症状 | 解决 |
|------|------|
| `pytest` 报 ModuleNotFoundError | `pip install -e .` 重装一次 |
| `compute` 显示某只基金 "no price data" | 先跑 `sync` 拉该只数据 |
| RSI 大量 NaN | 正常,前 14 天没数据 |
| `ma_250` 全是 NaN | 该基金历史不足 250 天,正常 |
