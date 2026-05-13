"use client";

import { createChart, ColorType, IChartApi, LineStyle, LineSeriesPartialOptions, UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { IndicatorPoint, PricePoint } from "@/lib/types";

interface ChartProps {
  prices: PricePoint[];
  indicators: IndicatorPoint[];
}

function toUtcSeconds(dateStr: string): UTCTimestamp {
  // 'YYYY-MM-DD' → 当天 UTC 时间戳(秒)
  return (Date.parse(dateStr + "T00:00:00Z") / 1000) as UTCTimestamp;
}

export function PriceChart({ prices, indicators }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a8a39b",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1c1a17" },
        horzLines: { color: "#1c1a17" },
      },
      rightPriceScale: {
        borderColor: "#2a2724",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#2a2724",
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: "#3a3631", style: LineStyle.Dashed, width: 1 },
        horzLine: { color: "#3a3631", style: LineStyle.Dashed, width: 1 },
      },
      width: containerRef.current.clientWidth,
      height: 380,
      handleScale: true,
      handleScroll: true,
    });
    chartRef.current = chart;

    // 收盘价主线 — 暖琥珀
    const closeSeries = chart.addLineSeries({
      color: "#d4a574",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });
    closeSeries.setData(
      prices.map((p) => ({
        time: toUtcSeconds(p.date),
        value: p.adjClose,
      })),
    );

    // 三条 MA 叠加 — 由浅到深,细线
    const addMa = (
      values: (number | null)[],
      color: string,
      label: string,
    ): void => {
      const opts: LineSeriesPartialOptions = {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: label,
      };
      const series = chart.addLineSeries(opts);
      series.setData(
        indicators
          .map((ind, i) => {
            const v = values[i];
            if (v === null || v === undefined) return null;
            return { time: toUtcSeconds(ind.date), value: v };
          })
          .filter((x): x is { time: UTCTimestamp; value: number } => x !== null),
      );
    };

    addMa(indicators.map((i) => i.ma20), "#5eaa7a", "MA20");
    addMa(indicators.map((i) => i.ma120), "#807a72", "MA120");
    addMa(indicators.map((i) => i.ma250), "#5a554f", "MA250");

    chart.timeScale().fitContent();

    // 响应式
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [prices, indicators]);

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-400">
        <Legend color="#d4a574" label="累计净值" />
        <Legend color="#5eaa7a" label="MA20" />
        <Legend color="#807a72" label="MA120" />
        <Legend color="#5a554f" label="MA250" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-[2px] w-4"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono uppercase tracking-wider">{label}</span>
    </span>
  );
}
