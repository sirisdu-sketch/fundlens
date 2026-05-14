import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * 应用启动时自动确保 schema。
 *
 * 设计要点:
 * - schema 内嵌为 TypeScript 字符串,而不是读 schema.sql 文件。
 *   理由:Vercel / Railway 部署时打包路径不一定可控;内嵌 = 0 文件系统依赖。
 *   schema.sql 仍然保留在项目根作为人类可读的权威参考,但应用不读它。
 * - CREATE TABLE IF NOT EXISTS 是幂等的,反复跑不会破坏已有数据。
 * - 模块级 _initialized 标志:同一进程内只跑一次,避免重复 open/close。
 */

let _initialized = false;

const SCHEMA_SQL = `
-- ─────────────────────────────────────────────────────────────
-- FundLens schema (inlined from project root schema.sql)
-- ALWAYS keep this string in sync with /schema.sql
-- ─────────────────────────────────────────────────────────────

-- 品种主表
CREATE TABLE IF NOT EXISTS instruments (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    market      TEXT,
    status      TEXT DEFAULT 'active',
    updated_at  INTEGER
);

-- 日线行情
CREATE TABLE IF NOT EXISTS price_daily (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT NOT NULL,
    date        TEXT NOT NULL,
    open        REAL,
    high        REAL,
    low         REAL,
    close       REAL NOT NULL,
    volume      REAL,
    amount      REAL,
    adj_close   REAL,
    UNIQUE(code, date)
);
CREATE INDEX IF NOT EXISTS idx_price_code_date
    ON price_daily(code, date DESC);

-- 指标表
CREATE TABLE IF NOT EXISTS indicators (
    code        TEXT NOT NULL,
    date        TEXT NOT NULL,
    rsi_14      REAL,
    ma_20       REAL,
    ma_120      REAL,
    ma_250      REAL,
    volatility  REAL,
    momentum_20 REAL,
    PRIMARY KEY (code, date)
);

-- 同步日志
CREATE TABLE IF NOT EXISTS sync_log (
    code        TEXT NOT NULL,
    data_type   TEXT NOT NULL,
    last_date   TEXT,
    synced_at   INTEGER,
    PRIMARY KEY (code, data_type)
);

-- AI 解读缓存
CREATE TABLE IF NOT EXISTS research_contexts (
    code         TEXT NOT NULL,
    context_hash TEXT NOT NULL,
    model        TEXT NOT NULL,
    context_json TEXT NOT NULL,
    analysis     TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    PRIMARY KEY (code, context_hash, model)
);
`;

/**
 * 确保 schema 已建。幂等。可由多个模块在第一次访问 db 时调用。
 *
 * 步骤:
 *   1. 创建目录(若不存在)
 *   2. 以 RW 模式打开 db(allowMissing → 自动创建空文件)
 *   3. 执行 schema(全部 IF NOT EXISTS)
 *   4. 关闭 RW 连接,让查询连接以 readonly 模式接管
 */
export function ensureSchema(dbPath: string): void {
  if (_initialized) return;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);  // RW,允许文件不存在
  try {
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA_SQL);
  } finally {
    db.close();
  }

  _initialized = true;
}

/** 测试用:重置 initialized 状态。生产路径不需要。 */
export function _resetForTest(): void {
  _initialized = false;
}
