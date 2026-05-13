import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

import type { IndicatorPoint, PricePoint, Signal } from "./types";

// ============================================================
// SYSTEM PROMPT — 严格的"解说员"角色
//
// 关键原则:
// 1. Gemini 只翻译数字,不补充信息(GPT 的建议)
// 2. 不给具体操作建议(那是 signals.ts 的规则引擎职责)
// 3. 用词约束 + 长度约束,避免营销腔
// ============================================================
const SYSTEM_PROMPT = `你是 FundLens 的量化分析员，基于技术指标对基金走势做出专业研判。

【分析框架】
综合均线结构、动量、波动率与回撤，判断当前所处的趋势阶段，并给出概率性的后续展望。

【允许的分析方式】
1. 趋势研判：均线多头/空头/纠缠排列对应的趋势强度与方向
2. 动量与反转：RSI 处于超买/超卖/中性区间时的历史统计含义
3. 风险评估：波动率与最大回撤所反映的持仓风险
4. 情景分析：用"若……则……"描述关键价位突破后的大概率演变路径

【输出要求】
- 简体中文，150-250 字，一段纯文本，不使用 markdown、列表或 emoji
- 用概率性措辞（如"倾向于""偏多""历史上该形态通常""需警惕"），避免过度确定
- 覆盖顺序（可灵活调整）：趋势判断 → 动量/反转信号 → 风险提示 → 关键观察位
- 不给出"建议买入/卖出"等具体操作指令，但可以明确描述信号偏多/偏空的强度

【禁用词】"必涨"、"必跌"、"暴涨"、"暴跌"、"建议买入"、"建议卖出"、"加仓"、"减仓"
不要写标题或开场白，直接开始分析。`;

// ============================================================
// Context — 喂给 Gemini 的结构化输入
// ============================================================

export interface AiContext {
  code: string;
  name: string;
  date: string;
  close: number;
  indicators: IndicatorPoint;
  range30: {
    high: number;
    low: number;
    maxDrawdown: number;  // 负数
  };
  signal: Signal;
}

/**
 * 从原始数据构建 AI context。
 * 30 天的高低 / 回撤在这里就地算,避免在 prompt 里堆太多原始价格。
 */
export function buildContext(
  code: string,
  name: string,
  latest: IndicatorPoint,
  close: number,
  prices30d: PricePoint[],
  signal: Signal,
): AiContext {
  let high = -Infinity;
  let low = Infinity;
  let peak = prices30d[0]?.adjClose ?? close;
  let maxDD = 0;

  for (const p of prices30d) {
    const v = p.adjClose;
    if (v > high) high = v;
    if (v < low) low = v;
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    code,
    name,
    date: latest.date,
    close,
    indicators: latest,
    range30: {
      high: high === -Infinity ? close : high,
      low: low === Infinity ? close : low,
      maxDrawdown: maxDD,
    },
    signal,
  };
}

/**
 * 计算上下文哈希,作为缓存键。
 *
 * 关键设计:把数字 round 到合理精度,避免微小尾数变化每次都重算。
 * RSI 保留 1 位、均线 4 位、动量 2 位 — 跟前端展示一致。
 */
export function contextHash(ctx: AiContext): string {
  const normalized = {
    code: ctx.code,
    date: ctx.date,
    close: ctx.close.toFixed(4),
    rsi: ctx.indicators.rsi14?.toFixed(1) ?? null,
    ma20: ctx.indicators.ma20?.toFixed(4) ?? null,
    ma120: ctx.indicators.ma120?.toFixed(4) ?? null,
    ma250: ctx.indicators.ma250?.toFixed(4) ?? null,
    mom: ctx.indicators.momentum20?.toFixed(2) ?? null,
    vol: ctx.indicators.volatility?.toFixed(2) ?? null,
    signal: ctx.signal.level,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 16);
}

/**
 * 构建喂给 Gemini 的 user prompt。
 * 一切都是"已经计算好的数字",Gemini 只负责翻译成中文。
 */
export function buildUserPrompt(ctx: AiContext): string {
  const ind = ctx.indicators;

  const fmtMa = (ma: number | null, name: string): string => {
    if (ma === null) return `- ${name}:数据不足`;
    const diff = ((ctx.close - ma) / ma) * 100;
    const dir = diff >= 0 ? "上方" : "下方";
    return `- ${name}:${ma.toFixed(4)}(价格在 ${name} ${dir} ${Math.abs(diff).toFixed(1)}%)`;
  };

  const fmtNum = (v: number | null, fmt: (x: number) => string): string =>
    v === null ? "—" : fmt(v);

  return `INPUT:
基金代码:${ctx.code}
基金名称:${ctx.name}
观察日期:${ctx.date}

最新指标:
- 累计净值:${ctx.close.toFixed(4)}
- RSI(14):${fmtNum(ind.rsi14, (x) => x.toFixed(1))}
${fmtMa(ind.ma20, "MA20")}
${fmtMa(ind.ma120, "MA120")}
${fmtMa(ind.ma250, "MA250")}
- 20日动量:${fmtNum(ind.momentum20, (x) => `${x >= 0 ? "+" : ""}${x.toFixed(2)}%`)}
- 年化波动率:${fmtNum(ind.volatility, (x) => `${x.toFixed(2)}%`)}

近 30 天统计:
- 区间最高净值:${ctx.range30.high.toFixed(4)}
- 区间最低净值:${ctx.range30.low.toFixed(4)}
- 期间最大回撤:${(ctx.range30.maxDrawdown * 100).toFixed(2)}%

规则引擎信号:${ctx.signal.label}(${ctx.signal.reason})`;
}

// ============================================================
// Gemini 调用
// ============================================================

export const DEFAULT_MODEL = "gemini-2.5-flash";

export function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * 调用 Gemini。失败时抛出可读异常,由调用方决定怎么展示。
 */
export async function callGemini(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not configured. Add it to web/.env.local",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: getModelName(),
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4,
      maxOutputTokens: 3000,  // thinking token + 回复 token 共享此配额，需留足空间
      topP: 0.9,
      thinkingConfig: { thinkingBudget: 1024 },  // 轻量推理，够趋势研判用
    },
  });

  const text = (result.text ?? "").trim();

  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}
