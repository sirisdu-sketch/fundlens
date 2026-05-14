export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { getDb } = await import("./lib/db");
    await getDb().execute("SELECT 1");
    console.log("[fundlens] DB connection ready");
  } catch (err) {
    console.warn("[fundlens] DB connection deferred:", (err as Error).message);
  }
}
