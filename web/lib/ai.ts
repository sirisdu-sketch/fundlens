import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

import type { IndicatorPoint, PricePoint, Signal } from "./types";

// ============================================================
// SYSTEM PROMPT — 严格的"解说员"角色
//
// 关键原则:
// 1. Gemini 只翻译数字,不补充信息
// 2. 不给具体操作建议(那是 signals.ts 的规则引擎职责)
// 3. 用词约束 + 长度约束,避免营销腔
// ============================================================
export const SYSTEM_PROMPT = `你是 FundLens 内置的数据解说员。

【职责】
将下面 INPUT 中提供的结构化技术指标数字,翻译为 100-200 字的自然语言判断。

【严格规则】
1. 只使用 INPUT 中明确给出的数字。不补充任何外部信息——不引用新闻、行业、宏观数据、其他基金,也不预测未来走势或具体点位。
2. 不给出"建议买入/卖出/加仓/减仓"等具体操作建议。这些由系统的规则引擎单独处理,你只描述当前状态。
3. 输出:简体中文,一段纯文本,不使用 markdown、列表或 emoji。
4. 语气:专业、克制、客观,像研究报告而非营销文案。
5. 内容覆盖(顺序可调):
   - 当前价格相对于各均线的位置
   - RSI 与动量反映的短期状态
   - 波动率所处水平
   - 一个值得继续观察的条件(如"若跌破 X 均线则...""若 RSI 重回 Y 区间则...")
6. 禁用词汇:"必涨"、"必跌"、"暴涨"、"暴跌"、"建议买入"、"建议卖出"、"加仓"、"减仓"、"重仓"、"满仓"
7. 长度:100-200 字。不要写标题或开场白。`;

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
// Gemini 调用(新 SDK @google/genai)
//
// 新 SDK 关键变化:
// - import { GoogleGenAI } 而非 GoogleGenerativeAI
// - 不再 getGenerativeModel + model.generateContent,统一为
//   ai.models.generateContent({ model, contents, config })
// - response.text 是属性,不是 .text() 方法
// - systemInstruction / temperature / maxOutputTokens 直接放 config,
//   不再有嵌套的 generationConfig
// - 默认走 v1beta 端点;若需稳定端点可在 new GoogleGenAI({apiVersion:"v1"})
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

  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,       // 低温度,克制 + 一致
      maxOutputTokens: 800,   // 2.5 Flash 默认开启 thinking,留点预算
      topP: 0.9,
      // 关闭 thinking 节省 token 与延迟;解说员任务无需推理链
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}
