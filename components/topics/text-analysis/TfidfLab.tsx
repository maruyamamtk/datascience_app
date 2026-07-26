"use client";

import { useEffect, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { EN_CORPUS } from "@/lib/stats/text-analysis";
import { useTextAnalysisStore } from "@/lib/store/text-analysis";

const FORMULA = `\\text{tf-idf}(t,d)=\\underbrace{${term("tf", "?")}}_{\\text{tf}}\\times\\underbrace{${term("idf", "?")}}_{\\text{idf}}=${term("tfidf", "?")}`;

/**
 * tf-idf ラボ（描画層）。選んだ文書内の各語の tf・idf・tf-idf を棒グラフで並べ、
 * クリックした語の数値が数式の対応する項（tf・idf・tf-idf）へ実時間で反映される。
 * 文書選択（enSentenceIndex）は前処理ステッパーとメインストアを共有する（single source of truth）。
 */
export function TfidfLab() {
  const enSentenceIndex = useTextAnalysisStore((s) => s.controls.enSentenceIndex);
  const setControl = useTextAnalysisStore((s) => s.setControl);
  const words = useTextAnalysisStore((s) => s.derived.selectedDocWords);

  const [focus, setFocus] = useState(0);
  useEffect(() => setFocus(0), [enSentenceIndex]);

  const mathRef = useRef<MathFormulaHandle>(null);
  const focused = words[focus] ?? words[0];
  useEffect(() => {
    const m = mathRef.current;
    if (!m || !focused) return;
    m.setValue("tf", formatNumber(focused.tf, 3));
    m.setValue("idf", formatNumber(focused.idf, 3));
    m.setValue("tfidf", formatNumber(focused.tfidf, 4));
    m.setHighlight("tf", true, "#2563eb");
    m.setHighlight("idf", true, "#9333ea");
    m.setHighlight("tfidf", true, "#16a34a");
  }, [focused]);

  const maxTfidf = Math.max(...words.map((w) => w.tfidf), 1e-9);

  return (
    <div id="ta-tfidf" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ta-tfidf-doc" className="text-xs font-semibold text-slate-700">
          文書
        </label>
        <select
          id="ta-tfidf-doc"
          value={enSentenceIndex}
          onChange={(e) => setControl("enSentenceIndex", Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          {EN_CORPUS.map((s, i) => (
            <option key={s} value={i}>
              D{i + 1}
            </option>
          ))}
        </select>
        <span className="min-w-0 flex-1 break-words text-xs text-slate-500">{EN_CORPUS[enSentenceIndex]}</span>
      </div>

      <p className="text-sm text-slate-600">
        語をクリックすると、その語の tf（この文書内での出現割合）・idf（珍しさ）・tf-idf（両者の積）が下の数式に反映される。tf が同じ語同士でも、他の文書に出にくい珍しい語ほど idf が大きく、tf-idf が高くなる。
      </p>

      <div className="space-y-1.5">
        {words.map((w, i) => {
          const active = i === focus;
          return (
            <button
              key={w.term}
              type="button"
              onClick={() => setFocus(i)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                active ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="w-24 shrink-0 font-mono text-slate-700">{w.term}</span>
              <span className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                <span
                  className={`block h-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
                  style={{ width: `${Math.max(2, (w.tfidf / maxTfidf) * 100)}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right font-mono text-xs text-slate-500">{formatNumber(w.tfidf, 4)}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      {focused ? (
        <Callout
          title={`「${focused.term}」: tf=${formatNumber(focused.tf, 3)}, idf=${formatNumber(focused.idf, 3)}`}
          body={`tf-idf = ${formatNumber(focused.tf, 3)} × ${formatNumber(focused.idf, 3)} = ${formatNumber(focused.tfidf, 4)}。idf=ln(文書総数/その語を含む文書数) なので、全文書に出る語ほど0に近づき、珍しい語ほど大きくなる。`}
          note="tf だけを見ると «その文書での頻度» しか分からないが、idf を掛けることで «他の文書にも出るありふれた語» の重みを下げ、«その文書らしい語» を浮かび上がらせる。"
        />
      ) : null}
    </div>
  );
}
