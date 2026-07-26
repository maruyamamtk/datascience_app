"use client";

import { useEffect, useMemo } from "react";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import {
  useBackwardInductionStepperStore,
  useSequentialDecisionStore,
} from "@/lib/store/sequential-decision";
import { backwardInductionCells } from "@/lib/stats/sequential-decision";
import { buildBackwardInductionFrames } from "./frames";
import { ACTION_COLORS, num } from "./format";

/**
 * 後ろ向き帰納法(バックワードインダクション)ステッパー(L1)。
 * 期×状態の格子を、最終期(右端)から1セルずつ埋めていく様子をコマ送りで見せる
 * (decision-analysisのDecisionTreeStepperと同じ「アルゴリズム図鑑スタイル」を
 * 複数期間の格子に適用したもの)。列は時系列順(t=1が左、t=Tが右)に並べるので、
 * 右端から左へ値が確定していく様子が「後ろ向き」に見える。
 */
export function BackwardInductionStepper() {
  const problem = useSequentialDecisionStore((s) => s.derived.problem);
  const actions = useSequentialDecisionStore((s) => s.derived.actions);
  const states = useSequentialDecisionStore((s) => s.derived.states);

  const index = useBackwardInductionStepperStore((s) => s.frame.index);
  const count = useBackwardInductionStepperStore((s) => s.frame.count);
  const playing = useBackwardInductionStepperStore((s) => s.frame.playing);
  const nextFrame = useBackwardInductionStepperStore((s) => s.nextFrame);
  const prevFrame = useBackwardInductionStepperStore((s) => s.prevFrame);
  const goToFrame = useBackwardInductionStepperStore((s) => s.goToFrame);
  const setPlaying = useBackwardInductionStepperStore((s) => s.setPlaying);
  const setFrameCount = useBackwardInductionStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBackwardInductionFrames(problem), [problem]);
  const cellMap = useMemo(() => {
    const m = new Map<string, { value: number; actionIndex: number }>();
    for (const c of backwardInductionCells(problem)) {
      m.set(`${c.period}-${c.stateIndex}`, { value: c.value, actionIndex: c.actionIndex });
    }
    return m;
  }, [problem]);

  useEffect(() => setFrameCount(frames.length), [frames.length, setFrameCount]);
  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1800,
  });

  const frame = frameAt(frames, index);
  const payload = frame?.payload;
  const computedSet = new Set((payload?.computed ?? []).map((c) => `${c.period}-${c.stateIndex}`));
  const current = payload?.current ?? null;

  const periodList = Array.from({ length: problem.periods }, (_, i) => i + 1);

  function cellState(period: number, stateIndex: number): "hidden" | "current" | "done" {
    if (current && current.period === period && current.stateIndex === stateIndex) return "current";
    if (computedSet.has(`${period}-${stateIndex}`)) return "done";
    return "hidden";
  }

  function valueFor(period: number, stateIndex: number): { value: number; actionIndex: number } | null {
    const st = cellState(period, stateIndex);
    if (st === "hidden") return null;
    return cellMap.get(`${period}-${stateIndex}`) ?? null;
  }

  return (
    <div
      id="backward-induction-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        列は時点t(左が最初の期、右が最終期)、行は状態。最終期(右端)には「その先」がないので
        まずそこから計算でき、そこから左へ1セルずつ価値関数
        <span className="font-mono">V_t(s)</span>と最適行動が確定していく——これが
        <strong className="font-semibold text-slate-900">後ろ向き帰納法</strong>。
      </p>

      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[420px] border-collapse text-sm"
          data-testid="backward-induction-grid"
        >
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600">
                状態＼時点
              </th>
              {periodList.map((p) => (
                <th
                  key={p}
                  className="border border-slate-200 bg-slate-50 px-3 py-2 text-center font-medium text-slate-600"
                >
                  t={p}
                  {p === problem.periods ? (
                    <span className="ml-1 rounded bg-slate-200 px-1 text-[10px] text-slate-600">
                      最終期
                    </span>
                  ) : null}
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
                {periodList.map((p) => {
                  const st = cellState(p, si);
                  const v = valueFor(p, si);
                  return (
                    <td
                      key={p}
                      data-testid={`grid-cell-${p}-${si}`}
                      data-state={st}
                      className={`border px-3 py-3 text-center transition-colors ${
                        st === "current"
                          ? "border-amber-500 bg-amber-50"
                          : st === "done"
                            ? "border-slate-200 bg-blue-50"
                            : "border-slate-200 bg-slate-50 text-slate-300"
                      }`}
                    >
                      {st === "hidden" ? (
                        <span aria-hidden>?</span>
                      ) : v ? (
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-semibold text-slate-800">
                            {num(v.value)}
                          </div>
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: ACTION_COLORS[v.actionIndex] }}
                          >
                            {actions[v.actionIndex]}
                          </span>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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

      <p className="text-xs text-slate-500">
        この格子は上のPolicyLabと同じ問題設定(景気の続きやすさ・割引率γ・期間数T)を使っている
        ——設定を変えて見比べたい場合はPolicyLabのつまみを動かしてから、もう一度再生しよう。
      </p>
    </div>
  );
}
