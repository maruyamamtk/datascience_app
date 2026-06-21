"use client";

import type { ReactNode } from "react";

type VizPanelProps = {
  /** 番号付き見出しの番号（任意）。アルゴリズム図鑑の「番号付き見出し」規約。 */
  number?: number;
  /** 見出し（1画面1概念）。 */
  title: string;
  /** 見出し下の短い説明（任意）。 */
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * 可視化のレイアウト規約を体現する枠（描画層）。
 * 「1画面1概念・余白多め・番号付き見出し」（walking-skeleton.md §4）をどのトピックでも
 * 同じ様式で出すための共通コンテナ。中身に StepPlayer / Highlight / Callout を組み合わせる。
 */
export function VizPanel({ number, title, description, children, className = "" }: VizPanelProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      <header className="space-y-1">
        <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
          {number !== undefined ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {number}
            </span>
          ) : null}
          {title}
        </h2>
        {description ? <p className="leading-relaxed text-slate-600">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
