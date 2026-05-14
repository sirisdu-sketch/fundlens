"use client";

import { useState } from "react";

interface Props {
  code: string;
}

interface ResearchResponse {
  code: string;
  analysis: string;
  cached: boolean;
  generatedAt: number;
  model: string;
  hash: string;
}

interface PromptResponse {
  systemPrompt: string;
  userPrompt: string;
}

type UiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; data: ResearchResponse }
  | { kind: "error"; message: string };

type PromptPanel =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "shown"; text: string; copied: boolean };

export function AiResearch({ code }: Props) {
  const [state, setState] = useState<UiState>({ kind: "idle" });
  const [panel, setPanel] = useState<PromptPanel>({ kind: "hidden" });

  const generate = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/research/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data.error || `HTTP ${res.status}` });
        return;
      }
      setState({ kind: "done", data: data as ResearchResponse });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "网络错误",
      });
    }
  };

  const togglePrompt = async () => {
    if (panel.kind === "shown") {
      setPanel({ kind: "hidden" });
      return;
    }
    setPanel({ kind: "loading" });
    try {
      const res = await fetch(`/api/research/${code}/prompt`);
      const data: PromptResponse = await res.json();
      const text =
        `【系统提示词】\n${data.systemPrompt}\n\n【用户输入】\n${data.userPrompt}`;
      setPanel({ kind: "shown", text, copied: false });
    } catch {
      setPanel({ kind: "hidden" });
    }
  };

  const copyPrompt = () => {
    if (panel.kind !== "shown") return;
    navigator.clipboard.writeText(panel.text);
    setPanel({ ...panel, copied: true });
    setTimeout(
      () => setPanel((p) => (p.kind === "shown" ? { ...p, copied: false } : p)),
      2000,
    );
  };

  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900/40 p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="display text-2xl text-ink-100">AI 解读</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber/70">
            powered by Gemini
          </span>
        </div>
        <div className="flex items-center gap-4">
          {state.kind === "done" && (
            <span className="text-xs font-mono text-ink-500">
              {state.data.cached ? "缓存命中" : "刚刚生成"}
              <span className="ml-2 text-ink-600">·</span>
              <span className="ml-2 text-ink-600">{state.data.model}</span>
            </span>
          )}
          <button
            onClick={togglePrompt}
            disabled={panel.kind === "loading"}
            className={`text-xs font-mono uppercase tracking-wider transition-colors ${
              panel.kind === "shown"
                ? "text-amber"
                : "text-ink-500 hover:text-ink-200"
            }`}
          >
            {panel.kind === "loading"
              ? "..."
              : panel.kind === "shown"
                ? "收起提示词"
                : "导出提示词"}
          </button>
        </div>
      </div>

      {/* Main content */}
      {state.kind === "idle" && <Idle onClick={generate} />}
      {state.kind === "loading" && <Loading />}
      {state.kind === "done" && (
        <Done analysis={state.data.analysis} onRegenerate={generate} />
      )}
      {state.kind === "error" && (
        <ErrorView message={state.message} onRetry={generate} />
      )}

      {/* Prompt export panel */}
      {panel.kind === "shown" && (
        <PromptExportPanel
          text={panel.text}
          copied={panel.copied}
          onCopy={copyPrompt}
        />
      )}
    </section>
  );
}

function PromptExportPanel({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-ink-700 bg-ink-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400">
          完整提示词
        </p>
        <button
          onClick={onCopy}
          className={`text-xs font-mono px-3 py-1 rounded border transition-all ${
            copied
              ? "border-up/40 bg-up/10 text-up"
              : "border-ink-600 text-ink-400 hover:border-ink-400 hover:text-ink-200"
          }`}
        >
          {copied ? "✓ 已复制" : "复制全部"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        className="w-full h-52 text-[11px] font-mono text-ink-400 bg-transparent resize-y outline-none leading-relaxed scrollbar-thin"
      />
      <p className="mt-2 text-[11px] text-ink-600 leading-relaxed">
        将【系统提示词】贴入 AI 的&ldquo;系统提示&rdquo;栏，【用户输入】贴入对话框。
        <br />
        ChatGPT / Claude / Kimi 等均可使用。
      </p>
    </div>
  );
}

function Idle({ onClick }: { onClick: () => void }) {
  return (
    <div className="py-6">
      <button
        onClick={onClick}
        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber/10 border border-amber/30 text-amber-bright hover:bg-amber/20 hover:border-amber/50 transition-all"
      >
        <span className="text-base">✦</span>
        <span className="text-sm tracking-wide">生成 AI 解读</span>
      </button>
      <p className="mt-3 text-xs text-ink-500 leading-relaxed">
        将当前指标交给 Gemini 翻译为自然语言判断(100-200 字)。
        <br />
        同样输入会命中缓存,不会重复消耗 token。
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="py-8 flex items-center gap-3 text-ink-300">
      <span className="inline-flex gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </span>
      <span className="text-sm text-ink-400">Gemini 思考中...</span>
    </div>
  );
}

function Done({
  analysis,
  onRegenerate,
}: {
  analysis: string;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-ink-200 leading-[1.85] text-[15px]">{analysis}</p>
      <div className="flex items-center justify-between pt-4 border-t border-ink-800">
        <p className="text-[11px] text-ink-500 font-mono uppercase tracking-wider">
          仅供研究学习 · 不构成投资建议
        </p>
        <button
          onClick={onRegenerate}
          className="text-xs text-ink-500 hover:text-amber font-mono uppercase tracking-wider transition-colors"
        >
          ↻ 重新生成
        </button>
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const noKey = message.includes("GEMINI_API_KEY");

  if (noKey) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-800/60 p-4">
        <p className="text-ink-200 text-sm mb-2">尚未配置 Gemini API Key</p>
        <p className="text-xs text-ink-500 font-mono leading-relaxed">
          在 <span className="text-amber">web/.env.local</span> 添加:
          <br />
          <span className="text-ink-300">GEMINI_API_KEY=your_key_here</span>
          <br />
          然后重启 <span className="text-amber">npm run dev</span>
        </p>
        <p className="mt-3 text-xs text-ink-500">
          或点右上角
          <span className="text-ink-300 font-mono"> 导出提示词 </span>
          手动询问其他 AI。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-down text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs text-ink-400 hover:text-amber font-mono uppercase tracking-wider transition-colors"
      >
        ↻ 重试
      </button>
    </div>
  );
}
