import { getDb } from "./db";

export interface CachedAnalysis {
  analysis: string;
  generatedAt: number;
}

export async function getCached(
  code: string,
  hash: string,
  model: string,
): Promise<CachedAnalysis | null> {
  const result = await getDb().execute({
    sql: `SELECT analysis, generated_at FROM research_contexts
          WHERE code = ? AND context_hash = ? AND model = ?`,
    args: [code, hash, model],
  });
  const r = result.rows[0];
  if (!r) return null;
  return {
    analysis: r.analysis as string,
    generatedAt: Number(r.generated_at),
  };
}

export async function saveCache(
  code: string,
  hash: string,
  model: string,
  contextJson: string,
  analysis: string,
): Promise<void> {
  await getDb().execute({
    sql: `INSERT OR REPLACE INTO research_contexts
            (code, context_hash, model, context_json, analysis, generated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [code, hash, model, contextJson, analysis, Math.floor(Date.now() / 1000)],
  });
}
