"use client";

import { useEffect, useRef, useState } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useTextAnalysisStore } from "@/lib/store/text-analysis";

const FORMULA = `P(w\\mid c)=\\dfrac{\\text{count}(c,w)+\\alpha}{\\text{count}(c)+\\alpha V}=${term("pw", "?")}`;

/**
 * n-gram 言語モデル ラボ（描画層）。n（バイグラム/トライグラム）と文脈をコーパスに実在する
 * 組み合わせから選ぶと、次に来やすい語の条件付き確率 P(w|文脈) が棒グラフ・数式へ実時間反映される。
 */
export function NgramLab() {
  const ngramN = useTextAnalysisStore((s) => s.controls.ngramN);
  const ngramContextIndex = useTextAnalysisStore((s) => s.controls.ngramContextIndex);
  const setControl = useTextAnalysisStore((s) => s.setControl);
  const d = useTextAnalysisStore((s) => s.derived);

  const [focus, setFocus] = useState(0);
  useEffect(() => setFocus(0), [ngramN, ngramContextIndex]);

  const mathRef = useRef<MathFormulaHandle>(null);
  const top = d.nextWordCandidates[focus] ?? d.nextWordCandidates[0];
  useEffect(() => {
    const m = mathRef.current;
    if (!m || !top) return;
    m.setValue("pw", formatNumber(top.prob, 4));
    m.setHighlight("pw", true, "#2563eb");
  }, [top]);

  const maxProb = Math.max(...d.nextWordCandidates.map((c) => c.prob), 1e-9);

  return (
    <div id="ta-ngram" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700">n</span>
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setControl("ngramN", n);
                setControl("ngramContextIndex", 0);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                ngramN === n ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {n === 2 ? "バイグラム (n=2)" : "トライグラム (n=3)"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="ta-ngram-context" className="text-xs font-semibold text-slate-700">
            文脈 c
          </label>
          <select
            id="ta-ngram-context"
            value={ngramContextIndex}
            onChange={(e) => setControl("ngramContextIndex", Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 font-mono text-sm"
          >
            {d.ngramContextOptions.map((ctx, i) => (
              <option key={ctx.join(" ")} value={i}>
                {ctx.join(" ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        文脈 c=「{d.ngramContext.join(" ")}」の直後に来る語の確率 P(w|c) を、コーパス中の出現回数からラプラススムージング付きで見積もる。棒をクリックすると数式の値が切り替わる。
      </p>

      <div className="space-y-1.5">
        {d.nextWordCandidates.map((c, i) => {
          const active = i === focus;
          return (
            <button
              key={c.word}
              type="button"
              onClick={() => setFocus(i)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="w-24 shrink-0 font-mono text-slate-700">{c.word}</span>
              <span className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                <span
                  className={`block h-full ${active ? "bg-blue-500" : "bg-slate-400"}`}
                  style={{ width: `${Math.max(2, (c.prob / maxProb) * 100)}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">{formatNumber(c.prob, 4)}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      {top ? (
        <Callout
          title={`P(${top.word} | ${d.ngramContext.join(" ")}) = ${formatNumber(top.prob, 4)}`}
          body={`count(c,w) を count(c) で割るだけだと、コーパスに一度も出ない組み合わせは確率0になってしまう。分子分母に +α・+αV（ラプラススムージング）を足すことで、未知の組み合わせにも小さな確率を残す。`}
          note="文全体の確率は、連鎖律 P(w₁…w_n)=∏P(wᵢ|w₁…wᵢ₋₁) を「直前 n-1 語だけを見る」というn-gram近似で置き換えたもの——真面目に全履歴を条件にすると組み合わせが爆発するのを防ぐ。"
        />
      ) : null}
    </div>
  );
}
