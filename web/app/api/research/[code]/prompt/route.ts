import { NextResponse } from "next/server";

import { SYSTEM_PROMPT, buildContext, buildUserPrompt } from "@/lib/ai";
import {
  getFund,
  getLatestClose,
  getLatestIndicator,
  getPrices,
} from "@/lib/queries";
import { generateSignal } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const { code } = params;

  const [fund, latest, close] = await Promise.all([
    getFund(code),
    getLatestIndicator(code),
    getLatestClose(code),
  ]);

  if (!fund || !latest || close === null) {
    return NextResponse.json({ error: "no data for this fund" }, { status: 404 });
  }

  const prices30d = await getPrices(code, "1m");
  const signal = generateSignal(latest, close);
  const ctx = buildContext(code, fund.name, latest, close, prices30d, signal);
  const userPrompt = buildUserPrompt(ctx);

  return NextResponse.json({ systemPrompt: SYSTEM_PROMPT, userPrompt });
}
