"use client";

import { useRouter, useSearchParams } from "next/navigation";

const RANGES: { value: string; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "max", label: "MAX" },
];

export function RangeTabs({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const onSelect = (range: string) => {
    const sp = new URLSearchParams(params);
    sp.set("range", range);
    router.push(`?${sp.toString()}`);
  };

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-ink-800 bg-ink-900/60 p-0.5">
      {RANGES.map((r) => {
        const active = r.value === current;
        return (
          <button
            key={r.value}
            onClick={() => onSelect(r.value)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
              active
                ? "bg-amber/15 text-amber-bright"
                : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
