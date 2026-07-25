"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { regretMatrix, type PayoffMatrix } from "@/lib/stats/decision-analysis";
import { useDecisionAnalysisStore, useRegretStepperStore } from "@/lib/store/decision-analysis";
import { buildRegretFrames } from "./frames";
import { num } from "./format";

const FORMULA = `${term("regret", "\\text{regret}")}(a,\\theta)=${term(
  "colmax",
  "?",
)}-c(a,\\theta)`;

const COLOR_MAX = "#f59e0b";
const COLOR_REGRET = "#2563eb";

/**
 * リグレット行列の構築ステッパー(L1)。利得行列から「状態(列)ごとの最大利得を探す→
 * その列のリグレットを計算する」という手順を1コマずつ見せ、最後にMinimax regretが選ぶ行動を示す
 * (アルゴリズム図鑑スタイル: コマ送り・色ハイライト・近傍コールアウト)。
 */
export function RegretMatrixStepper() {
  const payoffs = useDecisionAnalysisStore((s) => s.controls.payoffs);
  const actions = useDecisionAnalysisStore((s) => s.derived.actions);
  const states = useDecisionAnalysisStore((s) => s.derived.states);

  const index = useRegretStepperStore((s) => s.frame.index);
  const count = useRegretStepperStore((s) => s.frame.count);
  const playing = useRegretStepperStore((s) => s.frame.playing);
  const nextFrame = useRegretStepperStore((s) => s.nextFrame);
  const prevFrame = useRegretStepperStore((s) => s.prevFrame);
  const goToFrame = useRegretStepperStore((s) => s.goToFrame);
  const setPlaying = useRegretStepperStore((s) => s.setPlaying);
  const setFrameCount = useRegretStepperStore((s) => s.setFrameCount);

  const matrix: PayoffMatrix = useMemo(
    () => ({ actions, states, payoffs }),
    [actions, states, payoffs],
  );
  const regret = useMemo(() => regretMatrix(matrix), [matrix]);
  const frames = useMemo(() => buildRegretFrames(matrix), [matrix]);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1600,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const revealedStates = payload?.revealedStates ?? [];
  const currentState = payload?.stateIndex ?? null;
  const isFinal = payload?.phase === "final";

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m || currentState === null) return;
    const cMax = Math.max(...matrix.payoffs.map((row) => row[currentState]));
    m.setValue("colmax", formatNumber(cMax, 0));
    m.setHighlight("colmax", true, COLOR_MAX);
    m.setHighlight("regret", true, COLOR_REGRET);
  }, [currentState, matrix]);

  return (
    <div
      id="regret-matrix-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        利得行列から、状態(列)ごとに「もし最善の行動を選んでいたら得られたはずの利得」との差=<strong className="font-semibold text-slate-900">リグレット(後悔)</strong>
        を計算する過程を1コマずつ見る。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="regret-table">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                行動 \ 状態
              </th>
              {states.map((s, j) => (
                <th
                  key={s}
                  data-testid={`regret-col-header-${j}`}
                  className={`border border-slate-200 px-3 py-2 text-center font-medium ${
                    currentState === j ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => (
              <tr
                key={a}
                data-testid={`regret-row-${i}`}
                className={isFinal && i === payload?.bestIndex ? "bg-blue-50" : ""}
              >
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
                  {a}
                  {isFinal && i === payload?.bestIndex ? (
                    <span className="ml-1 text-xs font-bold text-blue-600">← 選択</span>
                  ) : null}
                </th>
                {states.map((s, j) => {
                  const shown = revealedStates.includes(j);
                  return (
                    <td
                      key={s}
                      data-testid={`regret-cell-${i}-${j}`}
                      className={`border border-slate-200 px-3 py-2 text-center ${
                        currentState === j ? "bg-amber-50/60" : ""
                      }`}
                    >
                      {shown ? num(regret[i][j]) : "?"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {isFinal ? (
              <tr>
                <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-500">
                  最大リグレット
                </th>
                <td
                  colSpan={states.length}
                  className="border border-slate-200 px-3 py-2 text-center text-xs text-slate-600"
                  data-testid="regret-max-summary"
                >
                  {actions.map((a, i) => `${a}=${num(payload?.maxRegrets?.[i])}`).join("　")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
      />
    </div>
  );
}
