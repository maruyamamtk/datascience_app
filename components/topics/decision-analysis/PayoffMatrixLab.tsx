"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { useDecisionAnalysisStore, type CriterionKey } from "@/lib/store/decision-analysis";
import { CRITERION_LABEL, num } from "./format";

const COLOR_BEST = "#2563eb";

const CRITERIA: { key: CriterionKey; label: string; hint: string }[] = [
  { key: "maximax", label: "Maximax", hint: "各行動の最大利得のうち最大を選ぶ(楽観的)" },
  { key: "maximin", label: "Maximin", hint: "各行動の最小利得のうち最大を選ぶ(悲観的)" },
  { key: "hurwicz", label: "Hurwicz", hint: "最大利得と最小利得をαで加重平均する" },
  { key: "minimax-regret", label: "Minimax regret", hint: "最大リグレット(後悔)が最小の行動を選ぶ" },
  { key: "laplace", label: "Laplace", hint: "状態が等確率だとみなし平均利得が最大の行動を選ぶ" },
];

function formulaFor(criterion: CriterionKey): string {
  switch (criterion) {
    case "maximax":
      return `${term("crit", "\\text{Maximax}")}(a)=\\max_\\theta\\, c(a,\\theta)\\ \\Rightarrow\\ \\max_a=${term(
        "score",
        "?",
      )}`;
    case "maximin":
      return `${term("crit", "\\text{Maximin}")}(a)=\\min_\\theta\\, c(a,\\theta)\\ \\Rightarrow\\ \\max_a=${term(
        "score",
        "?",
      )}`;
    case "hurwicz":
      return `${term("crit", "\\text{Hurwicz}")}(a)=${term("alpha", "?")}\\cdot\\max_\\theta c(a,\\theta)+(1-${term(
        "alpha2",
        "?",
      )})\\cdot\\min_\\theta c(a,\\theta)=${term("score", "?")}`;
    case "minimax-regret":
      return `${term("crit", "\\text{regret}")}(a,\\theta)=\\max_{a'} c(a',\\theta)-c(a,\\theta)\\ \\Rightarrow\\ \\min_a\\max_\\theta=${term(
        "score",
        "?",
      )}`;
    case "laplace":
      return `${term("crit", "\\text{Laplace}")}(a)=\\dfrac{1}{|\\Theta|}\\sum_\\theta c(a,\\theta)\\ \\Rightarrow\\ \\max_a=${term(
        "score",
        "?",
      )}`;
    default:
      return "";
  }
}

/**
 * 利得行列Lab(L0の中核可視化・描画層/Control層)。
 * 利得行列のセルを編集し、5つの決定基準(Maximax/Maximin/Hurwicz/Minimax regret/Laplace)を
 * 切り替えると、選ばれる行動がハイライトされ、数式中の該当値も連動して更新される
 * (操作→図→数式の強連動)。Hurwiczのαはαスライダーで操作する。
 */
export function PayoffMatrixLab() {
  const payoffs = useDecisionAnalysisStore((s) => s.controls.payoffs);
  const criterion = useDecisionAnalysisStore((s) => s.controls.criterion);
  const hurwiczAlpha = useDecisionAnalysisStore((s) => s.controls.hurwiczAlpha);
  const actions = useDecisionAnalysisStore((s) => s.derived.actions);
  const states = useDecisionAnalysisStore((s) => s.derived.states);
  const selected = useDecisionAnalysisStore((s) => s.derived.selected);
  const dominated = useDecisionAnalysisStore((s) => s.derived.dominated);
  const setControl = useDecisionAnalysisStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);

  const handleCellChange = (i: number, j: number, value: string) => {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    const next = payoffs.map((row) => [...row]);
    next[i][j] = v;
    setControl("payoffs", next);
  };

  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    const bestScore = selected.scores[selected.bestIndex];
    m.setValue("score", formatNumber(bestScore, 0));
    m.setHighlight("score", true, COLOR_BEST);
    if (criterion === "hurwicz") {
      m.setValue("alpha", formatNumber(hurwiczAlpha, 2));
      m.setValue("alpha2", formatNumber(hurwiczAlpha, 2));
      m.setHighlight("alpha", true, COLOR_BEST);
      m.setHighlight("alpha2", true, COLOR_BEST);
    }
  }, [selected, criterion, hurwiczAlpha]);

  const activeHint = CRITERIA.find((c) => c.key === criterion)?.hint ?? "";

  return (
    <div
      id="payoff-matrix-lab"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        工場の稼働台数(行動)と景気(自然の状態)の利得行列(出典:『意思決定分析と予測の活用』第2部第2章、単位:万円)。
        セルの数値を編集したり、下の決定基準を切り替えたりすると、選ばれる行動(行)がハイライトされる。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-sm" data-testid="payoff-table">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                行動 \ 状態
              </th>
              {states.map((s) => (
                <th
                  key={s}
                  className="border border-slate-200 bg-slate-50 px-3 py-2 text-center font-medium text-slate-500"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => {
              const isBest = i === selected.bestIndex;
              const isDominated = dominated.includes(i);
              return (
                <tr key={a} data-testid={`payoff-row-${i}`}>
                  <th
                    className={`border border-slate-200 px-3 py-2 text-left font-medium ${
                      isBest ? "bg-blue-50 text-blue-800" : "text-slate-700"
                    }`}
                  >
                    {a}
                    {isBest ? <span className="ml-1 text-xs font-bold text-blue-600">← 選択</span> : null}
                    {isDominated ? (
                      <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        優越される
                      </span>
                    ) : null}
                  </th>
                  {states.map((s, j) => (
                    <td
                      key={s}
                      className={`border border-slate-200 p-1 text-center ${
                        isBest ? "bg-blue-50" : ""
                      }`}
                    >
                      <input
                        type="number"
                        value={payoffs[i][j]}
                        onChange={(e) => handleCellChange(i, j, e.target.value)}
                        aria-label={`${a}・${s}の利得`}
                        data-testid={`payoff-input-${i}-${j}`}
                        className="w-16 rounded border border-slate-200 px-1 py-1 text-center text-sm"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="決定基準の選択">
        {CRITERIA.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setControl("criterion", c.key)}
            aria-pressed={criterion === c.key}
            data-testid={`criterion-btn-${c.key}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              criterion === c.key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{activeHint}</p>

      {criterion === "hurwicz" ? (
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          楽観係数 α = {num(hurwiczAlpha, 2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={hurwiczAlpha}
            onChange={(e) => setControl("hurwiczAlpha", Number(e.target.value))}
            aria-label="Hurwiczの楽観係数alpha"
            data-testid="hurwicz-alpha-slider"
            className="accent-blue-600"
          />
        </label>
      ) : null}

      <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3" data-testid="score-summary">
        {actions.map((a, i) => (
          <div
            key={a}
            className={`rounded-lg border px-3 py-2 ${
              i === selected.bestIndex ? "border-blue-400 bg-blue-50 text-blue-800" : "border-slate-200"
            }`}
          >
            {a}: スコア {num(selected.scores[i])}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={formulaFor(criterion)} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        現在の選択: <strong className="font-semibold text-slate-800">{CRITERION_LABEL[criterion]}</strong> が選ぶ行動は
        「{actions[selected.bestIndex]}」。
      </p>
    </div>
  );
}
