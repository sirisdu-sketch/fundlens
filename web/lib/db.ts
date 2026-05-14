import Database from "better-sqlite3";
import path from "path";

import { ensureSchema } from "./db-init";

// 模块级单例 — Next.js dev 模式下热重载也只创建一个连接
let _db: Database.Database | null = null;

function getDbPath(): string {
  // Next.js 在 web/ 子目录跑;数据库在项目根的 db/ 目录,与 Python 端共享
  return path.join(process.cwd(), "..", "db", "market.db");
}

/**
 * 获取只读 SQLite 连接(用于查询行情、指标)。
 *
 * 关键设计:
 * - 第一次调用时,先以 RW 模式建表(ensureSchema 幂等),再以 RO 模式打开
 * - 行情/指标由 Python 端 sync/compute 写入,Next.js 这条连接只查
 * - AI 缓存的写入由 lib/ai-cache.ts 的另一条 RW 连接负责
 * - 双连接划分体现 principle of least privilege:每条连接只拥有必需的权限
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = getDbPath();
  ensureSchema(dbPath);  // 幂等;保证文件 + 所有表都存在

  _db = new Database(dbPath, { readonly: true, fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  return _db;
}

/**
 * 把时间范围转成起始日期字符串(YYYY-MM-DD)。
 * "max" 返回 null,调用方应该跳过 date >= ? 条件。
 */
export function rangeToStartDate(range: string): string | null {
  const now = new Date();
  const map: Record<string, number> = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
  };
  const days = map[range];
  if (!days) return null;

  const d = new Date(now.getTime() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}
