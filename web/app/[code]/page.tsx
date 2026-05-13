import Link from "next/link";
import { notFound } from "next/navigation";

import { AiResearch } from "@/components/ai-research";
import { PriceChart } from "@/components/chart";
import { IndicatorPanel } from "@/components/indicator-panel";
import { RangeTabs } from "@/components/range-tabs";
import { SignalCard } from "@/components/signal-card";
import {
  computeMaxDrawdown,
  getFund,
  getIndicators,
  getLatestClose,
  getLatestIndicator,
  getPrices,
} from "@/lib/queries";
import { generateSignal } from "@/lib/signals";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { code: string };
  searchParams: { range?: string };
}

export default function FundDetailPage({ params, searchParams }: PageProps) {
  const fund = getFund(params.code);
  if (!fund) notFound();

  const range = searchParams.range || "1y";
  const prices = getPrices(params.code, range);
  const indicators = getIndicators(params.code, range);

  // Hero 卡用最新一行(不受 range 影响)
  const latest = getLatestIndicator(params.code);
  const close = getLatestClose(params.code);
  const signal = latest && close !== null ? generateSignal(latest, close) : null;

  // 最大回撤按近 1 年算(独立于 range,因为它要稳定)
  const prices1y = getPrices(params.code, "1y");
  const maxDD = computeMaxDrawdown(prices1y);

  return (
    <main className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-12">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-amber transition-colors font-mono uppercase tracking-[0.18em]"
      >
        ← FundLens
      </Link>

      {/* Title */}
      <header className="mt-6 mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-ink-500 uppercase tracking-[0.2em]">
            {fund.code} · {fund.type}
          </div>
          <h1 className="display text-4xl md:text-5xl text-ink-100 mt-2">
            {fund.name}
          </h1>
        </div>
        <RangeTabs current={range} />
      </header>

      {/* Hero 操作建议 */}
      {signal && latest && close !== null && (
        <section className="mb-10">
          <SignalCard
            signal={signal}
            latest={latest}
            close={close}
            showRules={true}
          />
        </section>
      )}

      {/* Chart */}
      <section className="mb-12">
        <div className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5 md:p-7">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="display text-2xl text-ink-100">价格走势</h2>
            <span className="text-xs font-mono text-ink-500">
              {prices.length} 个数据点
            </span>
          </div>
          {prices.length > 0 ? (
            <PriceChart prices={prices} indicators={indicators} />
          ) : (
            <div className="py-16 text-center text-ink-500 text-sm">
              该时间范围内无数据
            </div>
          )}
        </div>
      </section>

      {/* Indicators */}
      {latest && close !== null && (
        <section className="mb-12">
          <IndicatorPanel
            latest={latest}
            close={close}
            maxDrawdown1y={maxDD}
          />
        </section>
      )}

      {/* AI Research */}
      <section className="mb-12">
        <AiResearch code={params.code} />
      </section>

      <footer className="mt-16 pt-8 border-t border-ink-800 text-xs text-ink-500 font-mono">
        <p>仅供个人研究学习。不构成投资建议。</p>
        <p className="mt-1">
          数据来源:AKShare(累计净值) · 指标基于 SMA 计算
        </p>
      </footer>
    </main>
  );
}
