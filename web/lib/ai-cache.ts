import Database from "better-sqlite3";
import path from "path";

import { ensureSchema } from "./db-init";

/**
 * AI 缓存专用的读写连接。
 *
 * 设计选择:跟 lib/db.ts 的只读连接分开。理由:
 * - 行情/指标数据由 Python sync/compute 写,Next.js 只读
 * - AI 缓存由 Next.js 自己写
 * - 分离的连接让权限边界清晰,符合 principle of least privilege
 *
 * 建表统一由 lib/db-init.ts 的 ensureSchema 负责(幂等),
 * 本文件不再自己 CREATE TABLE,避免 schema 维护分散。
 */
let _db: Database.Database | null = null;

function getRwDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), "..", "db", "market.db");
  ensureSchema(dbPath);  // 幂等;若 lib/db.ts 已经调用过则直接返回

  _db = new Database(dbPath, { fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  return _db;
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
