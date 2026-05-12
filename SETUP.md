# Day 1 上午 — 上手指南

预计耗时:30-60 分钟(主要等 AKShare 拉数据)

## 0. 准备(2 分钟)

```bash
# 解压后进入项目目录
cd fundlens

# 在 VSCode 里打开
code .
```

VSCode 推荐插件:Python、Pylance、Ruff(已经在 pyproject.toml 配好规则)。

## 1. 创建虚拟环境(2 分钟)

**Windows (PowerShell)**:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Mac/Linux**:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

确认激活成功:命令行前面应该出现 `(.venv)`。

## 2. 安装依赖(3-5 分钟)

```bash
pip install -e ".[dev]"
```

`-e` 是 editable 安装,你改代码后不用重新装。`[dev]` 是开发依赖(pytest 等)。

> ⚠️ 如果 akshare 装得慢,加镜像:
> `pip install -e ".[dev]" -i https://pypi.tuna.tsinghua.edu.cn/simple`

## 3. 跑测试(30 秒)— 先确认环境对

```bash
pytest
```

应该看到 4 个测试全过。**如果挂了,先解决这里,数据再说**。

## 4. 同步基金数据(5-15 分钟)

```bash
python -m fundlens.sync
```

会看到:
```
[INFO] Database ready at .../db/market.db
[INFO] Syncing 5 fund(s)...
[INFO] Syncing fund 161725...
[INFO]   OK  161725 (招商中证白酒指数A): 1234 rows total, 1234 new, last 2026-05-09
[INFO] Syncing fund 019547...
...
```

**预期问题**:
- AKShare 首次跑会拉一个全市场基金列表(获取名称),会慢一点 / 偶尔超时。已经内置 3 次重试。
- 如果某只基金挂了,其他会继续。不要被一只失败搞乱节奏。

## 5. 验证数据进库了

```bash
# 看基金列表
sqlite3 db/market.db "SELECT code, name FROM instruments;"

# 看每只基金的行情条数
sqlite3 db/market.db "SELECT code, COUNT(*) AS n, MIN(date) AS start, MAX(date) AS end FROM price_daily GROUP BY code;"
```

或者在 VSCode 里装 **SQLite Viewer** 插件,双击 `db/market.db` 直接看表。

## 6. 提交第一个 commit

```bash
git init
git add .
git commit -m "feat: data layer with AKShare ingestion + sqlite schema"
```

用 GitHub Desktop 也行:Repository → Create New Repository → 指到 `fundlens` 目录,然后 Publish。

---

## Day 1 上午到此结束

**完成的事**:
- ✅ 项目骨架 + pyproject.toml(可发布的标准 Python 包)
- ✅ SQLite schema 4 张表
- ✅ AKShare 封装(限速 + 重试 + 错误处理)
- ✅ 5 只基金的累计净值入库
- ✅ pytest 4 个测试

**下一步:Day 1 下午**

- 在 `fundlens/indicators/` 写指标模块(RSI / MA / 最大回撤)
- 在 `tests/test_indicators.py` 写测试(用手算参考值)
- 计算结果写入 `indicators` 表

跑通本指南后跟我说"Day 1 上午搞定",我直接出 Day 1 下午的代码。

---

## 卡住怎么办

| 症状 | 解决 |
|------|------|
| `pip install` 装 akshare 报错 | 用清华镜像源(见上面) |
| `pytest` 报 `ModuleNotFoundError: fundlens` | 确认在 `.venv` 里,且跑了 `pip install -e .` |
| AKShare 拉数据超时 | 网络问题,重跑就行,数据是幂等的 |
| 某只基金代码拉不到 | 复制基金代码到天天基金网搜一下,确认是开放式基金 |
| Windows PowerShell 激活脚本被禁 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
