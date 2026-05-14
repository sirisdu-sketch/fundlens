import { createClient, type Client } from "@libsql/client";
import path from "path";

let _client: Client | null = null;

export function getDb(): Client {
  if (_client) return _client;

  const url =
    process.env.TURSO_DATABASE_URL ??
    `file:${path.resolve(process.cwd(), "..", "db", "market.db").replace(/\\/g, "/")}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  _client = authToken ? createClient({ url, authToken }) : createClient({ url });
  return _client;
}

export function rangeToStartDate(range: string): string | null {
  const map: Record<string, number> = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
  const days = map[range];
  if (!days) return null;
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}
