import { FundCard } from "@/components/fund-card";
import {
  getLatestClose,
  getLatestIndicator,
  listFunds,
} from "@/lib/queries";
import { generateSignal } from "@/lib/signals";
import type { Signal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const funds = await listFunds();

  const enriched = await Promise.all(
    funds.map(async (fund) => {
      const latest = await getLatestIndicator(fund.code);
      const close = await getLatestClose(fund.code);
      let signal: Signal | null = null;
      if (latest && close !== null) {
        signal = generateSignal(latest, close);
      }
      return { fund, latest, close, signal };
    }),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-16">
      {/* Hero */}
      <header className="mb-12 md:mb-16">
        <div className="flex items-baseline gap-3">
          <h1 className="display text-5xl md:text-7xl text-ink-100">
            FundLens
          </h1>
          <span className="display italic text-2xl md:text-3xl text-amber">
            基金透镜
          </span>
        </div>
        <p className="mt-4 max-w-xl text-ink-400 text-base md:text-lg leading-relaxed">
          个人基金分析平台。技术指标 + AI 解说,
          <span className="text-ink-200">看清楚再下手</span>。
        </p>

        <div className="mt-6 inline-flex items-center gap-2 text-xs text-ink-500 font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-up animate-pulse" />
          <span>{funds.length} 只基金已同步</span>
        </div>
      </header>

      {/* Fund grid */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="display text-2xl text-ink-100">关注列表</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
            按代码排序
          </span>
        </div>

        {enriched.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enriched.map((it) => (
              <FundCard
                key={it.fund.code}
                fund={it.fund}
                signal={it.signal}
                latest={it.latest}
                close={it.close}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-20 pt-8 border-t border-ink-800 text-xs text-ink-500 font-mono">
        <p>
          仅供个人研究学习。不构成投资建议。
        </p>
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-12 text-center">
      <div className="display text-2xl text-ink-300">还没有基金数据</div>
      <p className="mt-3 text-sm text-ink-500 font-mono">
        在项目根目录运行:python -m fundlens.sync &amp;&amp; python -m fundlens.compute
      </p>
    </div>
  );
}
