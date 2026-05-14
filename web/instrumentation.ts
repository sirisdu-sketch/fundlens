/**
 * Next.js instrumentation hook — runs once per server process on startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * 在这里做 DB 初始化:
 * - 保证 research_contexts 表在第一个 API 请求到来前就存在
 * - 同一进程内 getRwDb() 返回单例,不会重复建表
 * - Edge runtime 不支持 better-sqlite3,用 NEXT_RUNTIME 守卫
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const path = await import("path");
    const { ensureSchema } = await import("./lib/db-init");
    const dbPath = path.join(process.cwd(), "..", "db", "market.db");
    ensureSchema(dbPath);
    console.log("[fundlens] DB initialized: research_contexts ready");
  } catch (err) {
    // db/market.db 还不存在(Python sync 尚未运行)时静默跳过。
    // 首个 AI 请求到来时 getRwDb() 会再次尝试。
    console.warn("[fundlens] DB init deferred:", (err as Error).message);
  }
}
