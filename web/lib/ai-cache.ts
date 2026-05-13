import Database from "better-sqlite3";
import path from "path";

/**
 * AI 缓存专用的读写连接。
 *
 * 设计选择:跟 lib/db.ts 的只读连接分开。理由:
 * - 行情/指标数据由 Python sync/compute 写,Next.js 只读
 * - AI 缓存由 Next.js 自己写
 * - 分离的连接让权限边界清晰,符合 principle of least privilege
 */
let _db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), "..", "db", "market.db");

// research_contexts DDL — 幂等,可重复执行
const RESEARCH_CONTEXTS_DDL = `
  CREATE TABLE IF NOT EXISTS research_contexts (
    code         TEXT NOT NULL,
    context_hash TEXT NOT NULL,
    model        TEXT NOT NULL,
    context_json TEXT NOT NULL,
    analysis     TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    PRIMARY KEY (code, context_hash, model)
  )
`;

function getRwDb(): Database.Database {
  if (_db) return _db;

  // 不传 fileMustExist,让 better-sqlite3 在文件不存在时自动创建
  // (本地:Python sync 通常会先建好;Railway/Vercel 首次启动时由此创建)
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(RESEARCH_CONTEXTS_DDL);
  return _db;
}

/**
 * 在 Next.js 启动时主动初始化 DB,确保 research_contexts 表就绪。
 * 由 instrumentation.ts 调用;正常请求路径也会通过 getRwDb() 兜底。
 */
export function initRwDb(): void {
  getRwDb();
}

export interface CachedAnalysis {
  analysis: string;
  generatedAt: number;  // unix seconds
}

export function getCached(
  code: string,
  hash: string,
  model: string,
): CachedAnalysis | null {
  const row = getRwDb()
    .prepare(
      `SELECT analysis, generated_at FROM research_contexts
       WHERE code = ? AND context_hash = ? AND model = ?`,
    )
    .get(code, hash, model) as
    | { analysis: string; generated_at: number }
    | undefined;

  if (!row) return null;
  return { analysis: row.analysis, generatedAt: row.generated_at };
}

export function saveCache(
  code: string,
  hash: string,
  model: string,
  contextJson: string,
  analysis: string,
): void {
  getRwDb()
    .prepare(
      `INSERT OR REPLACE INTO research_contexts
         (code, context_hash, model, context_json, analysis, generated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      code,
      hash,
      model,
      contextJson,
      analysis,
      Math.floor(Date.now() / 1000),
    );
}
