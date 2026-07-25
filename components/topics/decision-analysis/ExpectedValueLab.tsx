"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { useDecisionAnalysisStore } from "@/lib/store/decision-analysis";
import { num, pct } from "./format";

const FORMULA = `\\mathrm{ESV}(a)=${term("p", "?")}\\cdot c(a,\\text{好況})+(1-${term(
  "p2",
  "?",
)})\\cdot c(a,\\text{不況})=${term("val", "?")}`;

const COLOR_BEST = "#2563eb";
const COLOR_P = "#f59e0b";

/**
 * 期待値による意思決定Lab(L2)。自然の状態(好況/不況)の確率p(好況)をスライダーで操作すると、
 * 各行動のESV(期待利得)が再計算され、最大の行動がハイライトされる(操作→図→数式の強連動)。
 * pを大きくしていくとハイリスク・ハイリターンな行動が選ばれる側に転じる様子を体感できる。
 */
export function ExpectedValueLab() {
  const probGood = useDecisionAnalysisStore((s) => s.controls.probGood);
  const actions = useDecisionAnalysisStore((s) => s.derived.actions);
  const esv = useDecisionAnalysisStore((s) => s.derived.esv);
  const setControl = useDecisionAnalysisStore((s) => s.setControl);

  const maxAbs = Math.max(1, ...esv.scores.map((v) => Math.abs(v)));

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("p", formatNumber(probGood, 2));
    m.setValue("p2", formatNumber(probGood, 2));
    m.setValue("val", formatNumber(esv.scores[esv.bestIndex], 0));
    m.setHighlight("p", true, COLOR_P);
    m.setHighlight("p2", true, COLOR_P);
    m.setHighlight("val", true, COLOR_BEST);
  }, [probGood, esv]);

  return (
    <div
      id="expected-value-lab"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        自然の状態の確率が分かっている(リスク下の意思決定)とき、期待利得
        <strong className="font-semibold text-slate-900">ESV(Expected State Value)</strong>
        が最大の行動を選ぶ。好況になる確率 p を動かして、選ばれる行動がどう変わるか確かめよう。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        好況になる確率 p = {pct(probGood)}(不況になる確率は {pct(1 - probGood)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={probGood}
          onChange={(e) => setControl("probGood", Number(e.target.value))}
          aria-label="好況になる確率p"
          data-testid="prob-good-slider"
          className="accent-amber-500"
        />
      </label>

      <div className="space-y-2" data-testid="esv-bars">
        {actions.map((a, i) => {
          const v = esv.scores[i];
          const widthPct = (Math.abs(v) / maxAbs) * 100;
          const isBest = i === esv.bestIndex;
          return (
            <div key={a} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-16 shrink-0 text-right font-medium">{a}</span>
              <div className="h-4 flex-1 rounded bg-slate-100">
                <div
                  className={`h-4 rounded ${isBest ? "bg-blue-600" : "bg-slate-400"}`}
                  style={{ width: `${widthPct}%` }}
                  data-testid={`esv-bar-${i}`}
                />
              </div>
              <span className={`w-16 shrink-0 font-mono ${isBest ? "font-bold text-blue-700" : ""}`}>
                {num(v)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        現在 ESV が最大の行動は「
        <strong className="font-semibold text-slate-800">{actions[esv.bestIndex]}</strong>
        」({num(esv.scores[esv.bestIndex])})。
      </p>
    </div>
  );
}
