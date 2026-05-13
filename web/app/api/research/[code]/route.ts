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
// AI 调用可能 5-15 秒,稍微给点超时余地
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const { code } = params;

  // 1. 拼上下文
  const fund = getFund(code);
  const latest = getLatestIndicator(code);
  const close = getLatestClose(code);
  if (!fund || !latest || close === null) {
    return NextResponse.json(
      { error: "no data for this fund" },
      { status: 404 },
    );
  }

  const prices30d = getPrices(code, "1m");
  const signal = generateSignal(latest, close);
  const ctx = buildContext(code, fund.name, latest, close, prices30d, signal);
  const hash = contextHash(ctx);
  const model = getModelName();

  // 2. 缓存优先
  const cached = getCached(code, hash, model);
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

  // 3. 调 Gemini
  try {
    const prompt = buildUserPrompt(ctx);
    const analysis = await callGemini(prompt);
    saveCache(code, hash, model, JSON.stringify(ctx), analysis);
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
    // 503 — 服务暂不可用。前端会优雅展示。
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
