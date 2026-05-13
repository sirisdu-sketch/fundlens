-- FundLens database schema
-- Run: sqlite3 db/market.db < schema.sql
-- Or: python -m fundlens.sync (auto-init)

-- 品种主表
CREATE TABLE IF NOT EXISTS instruments (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,          -- 基金/ETF/股票/指数
    market      TEXT,                   -- CN/HK/US
    status      TEXT DEFAULT 'active',  -- active/delisted
    updated_at  INTEGER                 -- unix timestamp
);

-- 日线行情（核心表）
-- 对基金：close = adj_close = 累计净值（已含分红再投）
-- 对 ETF/股票：close = 不复权收盘价，adj_close = 前复权
CREATE TABLE IF NOT EXISTS price_daily (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT NOT NULL,
    date        TEXT NOT NULL,          -- YYYY-MM-DD
    open        REAL,
    high        REAL,
    low         REAL,
    close       REAL NOT NULL,
    volume      REAL,
    amount      REAL,
    adj_close   REAL,                   -- 指标计算用这个
    UNIQUE(code, date)
);
CREATE INDEX IF NOT EXISTS idx_price_code_date
    ON price_daily(code, date DESC);

-- 指标表（Day 1 下午填充）
CREATE TABLE IF NOT EXISTS indicators (
    code        TEXT NOT NULL,
    date        TEXT NOT NULL,
    rsi_14      REAL,
    ma_20       REAL,
    ma_120      REAL,
    ma_250      REAL,
    volatility  REAL,                   -- 年化波动率（近20日，%）
    momentum_20 REAL,                   -- 20日动量（%）
    PRIMARY KEY (code, date)
);

-- 同步日志（避免重复请求）
CREATE TABLE IF NOT EXISTS sync_log (
    code        TEXT NOT NULL,
    data_type   TEXT NOT NULL,          -- prices/indicators
    last_date   TEXT,                   -- 最新数据日期
    synced_at   INTEGER,                -- 上次同步时间
    PRIMARY KEY (code, data_type)
);

-- AI 解读缓存(Day 3)
-- 设计要点:
-- 1. 主键含 context_hash → 同样输入数字 → 直接返回缓存,不重复烧 token
-- 2. 主键含 model → 换模型重新生成,旧记录保留可对比
-- 3. context_json 完整存输入,方便审计 / 复现
CREATE TABLE IF NOT EXISTS research_contexts (
    code         TEXT NOT NULL,
    context_hash TEXT NOT NULL,   -- 输入数字归一化后的 SHA256 前 16 位
    model        TEXT NOT NULL,
    context_json TEXT NOT NULL,
    analysis     TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    PRIMARY KEY (code, context_hash, model)
);
