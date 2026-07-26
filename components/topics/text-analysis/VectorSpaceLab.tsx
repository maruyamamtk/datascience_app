"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { EN_CORPUS } from "@/lib/stats/text-analysis";
import { QUERY_PRESETS, useTextAnalysisStore } from "@/lib/store/text-analysis";

const SIM_FORMULA = `\\cos(\\vec a,\\vec b)=\\dfrac{\\vec a\\cdot\\vec b}{\\lVert\\vec a\\rVert\\,\\lVert\\vec b\\rVert}=${term("sim", "?")}`;

/**
 * ベクトル空間モデル ラボ（描画層）。単語埋め込み（共起ベース）どうしのコサイン類似度と、
 * ベクトル空間モデルによる文書検索（クエリとのコサイン類似度で文書を順位付け）を1つにまとめる
 * ——どちらも「対象をベクトルにしてコサイン類似度で近さを測る」という同じ考え方の応用。
 */
export function VectorSpaceLab() {
  const wordVocabulary = useTextAnalysisStore((s) => s.derived.wordVocabulary);
  const wordAIndex = useTextAnalysisStore((s) => s.controls.wordAIndex);
  const wordBIndex = useTextAnalysisStore((s) => s.controls.wordBIndex);
  const wordSimilarity = useTextAnalysisStore((s) => s.derived.wordSimilarity);
  const queryPresetIndex = useTextAnalysisStore((s) => s.controls.queryPresetIndex);
  const rankedDocs = useTextAnalysisStore((s) => s.derived.rankedDocs);
  const setControl = useTextAnalysisStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("sim", formatNumber(wordSimilarity, 3));
    m.setHighlight("sim", true, wordSimilarity > 0.3 ? "#16a34a" : "#64748b");
  }, [wordSimilarity]);

  const maxScore = Math.max(...rankedDocs.map((r) => r.score), 1e-9);

  return (
    <div id="ta-vecspace" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">① 単語埋め込み: 2語のベクトルはどれくらい似ている？</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={wordAIndex}
            onChange={(e) => setControl("wordAIndex", Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 font-mono text-sm"
          >
            {wordVocabulary.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
          <span className="text-slate-400">×</span>
          <select
            value={wordBIndex}
            onChange={(e) => setControl("wordBIndex", Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 font-mono text-sm"
          >
            {wordVocabulary.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="h-3 overflow-hidden rounded bg-slate-100">
          <div
            className={`h-full ${wordSimilarity > 0.3 ? "bg-emerald-500" : "bg-slate-400"}`}
            style={{ width: `${Math.max(0, Math.min(100, wordSimilarity * 100))}%` }}
          />
        </div>

        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRef} tex={SIM_FORMULA} display={false} />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700">② ベクトル空間モデル: クエリに近い文書を検索する</p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ta-query" className="text-xs font-semibold text-slate-700">
            クエリ
          </label>
          <select
            id="ta-query"
            value={queryPresetIndex}
            onChange={(e) => setControl("queryPresetIndex", Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            {QUERY_PRESETS.map((q, i) => (
              <option key={q} value={i}>
                “{q}”
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          {rankedDocs.map((r, rank) => (
            <div key={r.index} className="flex items-center gap-2 text-sm">
              <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-400">{rank + 1}位</span>
              <span className="w-40 shrink-0 truncate font-mono text-xs text-slate-700">D{r.index + 1}: {EN_CORPUS[r.index]}</span>
              <span className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                <span
                  className={`block h-full ${rank === 0 && r.score > 0 ? "bg-blue-500" : "bg-slate-400"}`}
                  style={{ width: `${Math.max(2, (r.score / maxScore) * 100)}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">{formatNumber(r.score, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      <Callout
        title="同じ道具（コサイン類似度）の2つの使い道"
        body="①は «語» を共起ベクトルにして意味の近さを測り、②は «文書» を tf-idf ベクトルにしてクエリとの関連度を測っている。ベクトル空間モデルは «文章を空間上の点とみなし、近さ＝コサイン類似度で測る» という考え方そのもの。"
        note="単語埋め込みは、ニューラルネットの«埋め込み層»として重みを学習で獲得する方法（word2vec等）が主流。ここでは学習の代わりに共起カウントをそのままベクトルにする最も単純な«カウントベース»の埋め込みを使っている。"
      />
    </div>
  );
}
