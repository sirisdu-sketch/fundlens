import Database from "better-sqlite3";
import path from "path";

// 模块级单例 — Next.js dev 模式下热重载也只创建一个连接
let _db: Database.Database | null = null;

/**
 * 获取 SQLite 连接。
 *
 * - 路径:相对于 web/ 目录的上一级 db/market.db
 *   即整个项目根下的 db 目录,跟 Python 端共享同一个文件。
 * - 只读模式:web 层只做查询。写入由 Python 端 sync/compute 完成。
 * - readonly + fileMustExist:文件不存在直接抛错,而不是悄悄创建空 db。
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), "..", "db", "market.db");
  _db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });
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
