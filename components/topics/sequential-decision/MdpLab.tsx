"use client";

import { useEffect, useRef } from "react";
import { Term } from "@/components/content";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { useSequentialDecisionStore } from "@/lib/store/sequential-decision";
import { MAX_PERIODS, MIN_PERIODS } from "@/lib/stats/sequential-decision";
import { ACTION_COLORS, num, pct } from "./format";

const COLOR_R = "#f59e0b";
const COLOR_FUTURE = "#9333ea";
const COLOR_V = "#2563eb";

// t・sは状態依存の添字表示のみなのでtermでは包まない。r・future(割引した将来価値)・Vの3項を連動させる。
const FORMULA = `V_t(s)=\\max_a\\Big[\\underbrace{r(a,s)}_{${term(
  "r",
  "?",
)}}+\\gamma\\underbrace{\\textstyle\\sum_{s'}P(s'\\mid s)V_{t+1}(s')}_{${term(
  "future",
  "?",
)}}\\Big]=${term("v", "?")}`;

/**
 * MDPとしての定式化Lab(L2)。期×状態の格子(政策・価値関数)をセルクリックで選択すると、
 * 選んだ(t,s)についてのBellman方程式 V_t(s)=max_a[r(a,s)+γΣP(s'|s)V_{t+1}(s')] の
 * 各項(即時報酬r・割引した将来価値・V)の数値が数式中でハイライトされる
 * (操作→図→数式の強連動)。景気の続きやすさ・割引率・期間数はPolicyLab/BackwardInductionStepperと
 * 同じストアを共有するため、そちらを動かした結果もこのLabに反映される。
 */
export function MdpLab() {
  const persistence = useSequentialDecisionStore((s) => s.controls.persistence);
  const discount = useSequentialDecisionStore((s) => s.controls.discount);
  const periods = useSequentialDecisionStore((s) => s.controls.periods);
  const selectedCell = useSequentialDecisionStore((s) => s.controls.selectedCell);
  const setControl = useSequentialDecisionStore((s) => s.setControl);

  const actions = useSequentialDecisionStore((s) => s.derived.actions);
  const states = useSequentialDecisionStore((s) => s.derived.states);
  const transition = useSequentialDecisionStore((s) => s.derived.transition);
  const resultsChronological = useSequentialDecisionStore((s) => s.derived.resultsChronological);
  const resultsByPeriod = useSequentialDecisionStore((s) => s.derived.resultsBackward);

  const cell =
    selectedCell ??
    (resultsChronological.length > 0 ? { period: resultsChronological[0].period, stateIndex: 0 } : null);
  const cellPeriod = cell?.period;
  const cellStateIndex = cell?.stateIndex;

  const mathRef = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRef.current;
    if (!m || cellPeriod === undefined || cellStateIndex === undefined) return;
    const result = resultsByPeriod.find((r) => r.period === cellPeriod);
    if (!result) return;
    const a = result.actionIndexByState[cellStateIndex];
    const rValue = actionImmediateReward(a, cellStateIndex, resultsByPeriod);
    const totalV = result.valueByState[cellStateIndex];
    const future = discount > 0 ? (totalV - rValue) / discount : 0;

    m.setValue("r", formatNumber(rValue, 0));
    m.setValue("future", formatNumber(future, 2));
    m.setValue("v", formatNumber(totalV, 0));
    m.setHighlight("r", true, COLOR_R);
    m.setHighlight("future", true, COLOR_FUTURE);
    m.setHighlight("v", true, COLOR_V);
  }, [cellPeriod, cellStateIndex, resultsByPeriod, discount]);

  return (
    <div id="mdp-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        逐次決定問題は<Term id="markov-decision-process">マルコフ決定過程(MDP)</Term>
        (状態・行動・報酬・遷移確率・割引率)として定式化できる。下の格子で好きなセル(時点t・状態s)を
        クリックすると、そのセルのBellman方程式の中身(即時報酬・割引した将来価値・V)が数式に反映される。
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          景気の続きやすさ = {pct(persistence)}
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.01}
            value={persistence}
            onChange={(e) => setControl("persistence", Number(e.target.value))}
            aria-label="景気の続きやすさ(MdpLab)"
            data-testid="mdp-persistence-slider"
            className="accent-amber-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          割引率 γ = {discount.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={discount}
            onChange={(e) => setControl("discount", Number(e.target.value))}
            aria-label="割引率ガンマ(MdpLab)"
            data-testid="mdp-discount-slider"
            className="accent-blue-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          期間数 T = {periods}
          <input
            type="range"
            min={MIN_PERIODS}
            max={MAX_PERIODS}
            step={1}
            value={periods}
            onChange={(e) => setControl("periods", Number(e.target.value))}
            aria-label="期間数T(MdpLab)"
            data-testid="mdp-periods-slider"
            className="accent-emerald-600"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="mdp-grid">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600">
                状態＼時点
              </th>
              {resultsChronological.map((r) => (
                <th
                  key={r.period}
                  className="border border-slate-200 bg-slate-50 px-3 py-2 text-center font-medium text-slate-600"
                >
                  t={r.period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((stateLabel, si) => (
              <tr key={stateLabel}>
                <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">
                  {stateLabel}
                </td>
                {resultsChronological.map((r) => {
                  const isSelected = cell?.period === r.period && cell?.stateIndex === si;
                  const ai = r.actionIndexByState[si];
                  return (
                    <td
                      key={r.period}
                      data-testid={`mdp-cell-${r.period}-${si}`}
                      className={`cursor-pointer border px-3 py-3 text-center transition-colors hover:bg-blue-50 ${
                        isSelected ? "border-blue-600 bg-blue-50 ring-2 ring-blue-400" : "border-slate-200"
                      }`}
                      onClick={() => setControl("selectedCell", { period: r.period, stateIndex: si })}
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-semibold text-slate-800">
                          {num(r.valueByState[si])}
                        </div>
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: ACTION_COLORS[ai] }}
                        >
                          {actions[ai]}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        現在選択中: t={cell?.period ?? "—"}・状態「{cell ? states[cell.stateIndex] : "—"}」。遷移確率
        P(好況→好況)={pct(transition[0][0])}、P(不況→不況)={pct(transition[1][1])}。
      </p>
    </div>
  );
}

/** 選択セルの(a,s)に対応する即時報酬r(a,s)を取り出す(resultsByPeriodは全期分持つのでmatrixに頼らず引ける)。 */
function actionImmediateReward(
  actionIndex: number,
  stateIndex: number,
  results: { period: number; qByState: number[][] }[],
): number {
  // qByState[s][a] = r(a,s) + γ・future なので、future=0の項(最終期のqByState)から即時報酬を復元するのは
  // 期に依らず一定(rはtに依存しない)。最終期(将来価値の寄与がない)のqByStateをそのまま使う。
  const last = results.reduce((max, r) => (r.period > max.period ? r : max), results[0]);
  return last.qByState[stateIndex][actionIndex];
}
