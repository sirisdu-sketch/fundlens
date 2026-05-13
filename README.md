# FundLens

> Personal fund analysis platform — built in 3 days as a portfolio piece.

**Status**: Day 2 complete — full-stack MVP runs end-to-end

## Architecture (3-day MVP)

```
AKShare → Python sync script → SQLite ← Next.js API routes → React UI
                                  ↓
                          Gemini AI (解说员)
```

## Quick start

```bash
# 1. 安装依赖(建议用 venv)
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# 2. 拉取基金数据
python -m fundlens.sync

# 3. 跑测试
pytest

# 4. 启动 Web 前端
cd web && npm install && npm run dev
# 打开 http://localhost:3000

# 5. 查看数据库内容
sqlite3 db/market.db "SELECT code, name FROM instruments;"
sqlite3 db/market.db "SELECT COUNT(*) FROM price_daily;"
```

## Project structure

```
fundlens/
├── fundlens/            # Python package
│   ├── codes.py         # 关注列表
│   ├── db.py            # SQLite 连接管理
│   ├── fetcher.py       # AKShare 封装(限速+重试)
│   └── sync.py          # 同步入口 CLI
├── tests/               # pytest 测试
├── schema.sql           # 数据库定义
├── db/                  # SQLite 文件(gitignored)
└── pyproject.toml
```

## Roadmap

- [x] Day 1 上午:数据层 + AKShare 摄取
- [x] Day 1 下午:核心指标(RSI / MA / 最大回撤)+ pytest 覆盖
- [x] Day 2:Next.js + lightweight-charts 详情页
- [ ] Day 3:Gemini AI 解说 + CI + 部署

## Tech decisions

| Choice | Why |
|--------|-----|
| SQLite | Zero config, embedded, supports millions of rows |
| AKShare | Only free source covering full Chinese market |
| Next.js API routes | Avoid separate Python web server, single deploy |
| lightweight-charts | TradingView standard, 3KB, performant |

## Disclaimer

For personal study and analysis only. Not financial advice.
