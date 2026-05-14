/**
 * Schema reference — kept for documentation and one-time Turso setup.
 *
 * To initialise a Turso database:
 *   turso db shell <db-name> < schema.sql
 *
 * Local SQLite is initialised by the Python sync step.
 * This file is not imported by the running application.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS instruments (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    market      TEXT,
    status      TEXT DEFAULT 'active',
    updated_at  INTEGER
);

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
CREATE INDEX IF NOT EXISTS idx_price_code_date ON price_daily(code, date DESC);

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

CREATE TABLE IF NOT EXISTS sync_log (
    code        TEXT NOT NULL,
    data_type   TEXT NOT NULL,
    last_date   TEXT,
    synced_at   INTEGER,
    PRIMARY KEY (code, data_type)
);

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
