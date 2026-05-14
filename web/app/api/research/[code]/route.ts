import { NextResponse } from "next/server";

import {
  buildContext,
  buildUserPrompt,
  callGemini,
  contextHash,
  getModelName,
} from "@/lib/ai";
import { getCached, saveCache } from "@/lib/ai-cache";
import {
  getFund,
  getLatestClose,
  getLatestIndicator,
  getPrices,
} from "@/lib/queries";
import { generateSignal } from "@/lib/signals";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
    return NextResponse.json(
      { error: "no data for this fund" },
      { status: 404 },
    );
  }

  const prices30d = await getPrices(code, "1m");
  const signal = generateSignal(latest, close);
  const ctx = buildContext(code, fund.name, latest, close, prices30d, signal);
  const hash = contextHash(ctx);
  const model = getModelName();

  const cached = await getCached(code, hash, model);
  if (cached) {
    return NextResponse.json({
      code,
      analysis: cached.analysis,
      cached: true,
      generatedAt: cached.generatedAt,
      model,
      hash,
    });
  }

  try {
    const prompt = buildUserPrompt(ctx);
    const analysis = await callGemini(prompt);
    await saveCache(code, hash, model, JSON.stringify(ctx), analysis);
    return NextResponse.json({
      code,
      analysis,
      cached: false,
      generatedAt: Math.floor(Date.now() / 1000),
      model,
      hash,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI service unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
