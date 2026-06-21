"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { splitInlineMath } from "@/lib/content/inline-math";

/**
 * 用語定義文（`$...$` を含むプレーンテキスト）を描画する小さな描画層。
 * 計算層 splitInlineMath でテキスト/数式に分割し、数式断片だけ KaTeX で描画する。
 */
export function InlineDefinition({ text }: { text: string }) {
  const segments = useMemo(() => splitInlineMath(text), [text]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <span
            key={i}
            // 描画は KaTeX に閉じる。trust/strict は他の数式描画と揃える。
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(seg.value, {
                throwOnError: false,
                strict: false,
                trust: true,
              }),
            }}
          />
        ),
      )}
    </>
  );
}
