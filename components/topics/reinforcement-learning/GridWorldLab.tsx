"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer, type VizFrame } from "@/components/viz";
import {
  ACTION_ARROW,
  ACTIONS,
  cellFromIndex,
  GOAL_CELL,
  GRID_SIZE,
  START_CELL,
  stateIndex,
  TRAP_CELL,
} from "@/lib/stats/reinforcement-learning";
import { EPISODES_MAX, EPISODES_MIN, EPISODES_STEP, useReinforcementLearningStore } from "@/lib/store/reinforcement-learning";
import { cellCenterX, cellCenterY, cellLeft, cellPx, cellTop, GRID_PX, qValueColor, round2 } from "./grid-layout";

const { W, H } = GRID_PX;
const HEAT_SCALE = 10;

function bellmanFormula(alpha: number, gamma: number): string {
  const a = formatNumber(alpha, 2);
  const g = formatNumber(gamma, 2);
  return `Q(s,a)\\leftarrow ${term("qsa", "?")} + ${a}\\Big[${term("r", "?")} + ${g}\\cdot${term("maxq", "?")} - ${term(
    "qold",
    "?",
  )}\\Big] = ${term("qnew", "?")}`;
}

/**
 * グリッドワールド Q学習ラボ（Level0）: ε・α・γ・学習エピソード数を操作すると、
 * 5×5グリッドのQ値ヒートマップ（色）と貪欲方策（矢印）がリアルタイムに再学習・更新される。
 * StepPlayer は「最後に学習したエピソード」をコマ送りで再生し、そのステップの
 * ベルマン更新式（数式の該当項）が実時間で連動する（CLAUDE.md §0-3「操作→数式の強連動」）。
 */
export function GridWorldLab() {
  const controls = useReinforcementLearningStore((s) => s.controls);
  const d = useReinforcementLearningStore((s) => s.derived);
  const patchControls = useReinforcementLearningStore((s) => s.patchControls);

  const index = useReinforcementLearningStore((s) => s.frame.index);
  const count = useReinforcementLearningStore((s) => s.frame.count);
  const playing = useReinforcementLearningStore((s) => s.frame.playing);
  const nextFrame = useReinforcementLearningStore((s) => s.nextFrame);
  const prevFrame = useReinforcementLearningStore((s) => s.prevFrame);
  const goToFrame = useReinforcementLearningStore((s) => s.goToFrame);
  const setPlaying = useReinforcementLearningStore((s) => s.setPlaying);
  const setFrameCount = useReinforcementLearningStore((s) => s.setFrameCount);

  useEffect(() => {
    setFrameCount(d.lastEpisodeSteps.length);
  }, [d.lastEpisodeSteps.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 550 });

  const frames: VizFrame<{ stepIndex: number }>[] = useMemo(
    () => d.lastEpisodeSteps.map((_, i) => ({ payload: { stepIndex: i } })),
    [d.lastEpisodeSteps],
  );
  const frame = frameAt(frames, index);
  const currentStep = frame ? d.lastEpisodeSteps[frame.payload!.stepIndex] : undefined;

  const mathRef = useRef<MathFormulaHandle>(null);
  const tex = useMemo(() => bellmanFormula(controls.alpha, controls.gamma), [controls.alpha, controls.gamma]);

  useEffect(() => {
    const m = mathRef.current;
    if (!m || !currentStep) return;
    const { update } = currentStep;
    const tone = currentStep.explored ? "#d97706" : "#2563eb";
    m.setValue("qsa", formatNumber(update.qBefore, 2));
    m.setValue("qold", formatNumber(update.qBefore, 2));
    m.setValue("r", formatNumber(update.reward, 2));
    m.setValue("maxq", formatNumber(update.maxNextQ, 2));
    m.setValue("qnew", formatNumber(update.qAfter, 2));
    m.setHighlight("qsa", true, tone);
    m.setHighlight("qold", true, tone);
    m.setHighlight("r", true, "#059669");
    m.setHighlight("maxq", true, "#7c3aed");
    m.setHighlight("qnew", true, tone);
  }, [currentStep]);

  const goalIdx = stateIndex(GOAL_CELL);
  const trapIdx = stateIndex(TRAP_CELL);

  const stat = (label: string, value: string) => (
    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
      <div className="font-mono text-sm text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );

  return (
    <div id="grid-world-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        5×5のグリッドワールド。エージェントは左下（S）からスタートし、右上のゴール（G, 報酬+10）を目指す——ただし中央には落とし穴（×,
        報酬−10）があり、最短の対角線上を塞いでいる。ε・α・γ・学習エピソード数を動かして、Qテーブル（マスの色の濃さ）と貪欲方策（矢印）が育っていく様子を見てみよう。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            探索率 ε = <span className="font-mono">{formatNumber(controls.epsilon, 2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={controls.epsilon}
            onChange={(e) => patchControls({ epsilon: Number(e.target.value) })}
            aria-label="探索率イプシロン"
            className="accent-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            学習率 α = <span className="font-mono">{formatNumber(controls.alpha, 2)}</span>
          </span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={controls.alpha}
            onChange={(e) => patchControls({ alpha: Number(e.target.value) })}
            aria-label="学習率アルファ"
            className="accent-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            割引率 γ = <span className="font-mono">{formatNumber(controls.gamma, 2)}</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={controls.gamma}
            onChange={(e) => patchControls({ gamma: Number(e.target.value) })}
            aria-label="割引率ガンマ"
            className="accent-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span>
            学習エピソード数 = <span className="font-mono">{controls.episodesTrained}</span>
          </span>
          <input
            type="range"
            min={EPISODES_MIN}
            max={EPISODES_MAX}
            step={EPISODES_STEP}
            value={controls.episodesTrained}
            onChange={(e) => patchControls({ episodesTrained: Number(e.target.value) })}
            aria-label="学習エピソード数"
            className="accent-slate-900"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => patchControls({ episodesTrained: 0 })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          リセット（0エピソード）
        </button>
        <button
          type="button"
          onClick={() => patchControls({ episodesTrained: Math.min(EPISODES_MAX, controls.episodesTrained + 10) })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          +10エピソード学習
        </button>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="グリッドワールドのQ値ヒートマップと方策">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i).map((i) => {
            const cell = cellFromIndex(i);
            const isGoal = i === goalIdx;
            const isTrap = i === trapIdx;
            const fill = isGoal ? "#bbf7d0" : isTrap ? "#fecaca" : qValueColor(d.maxQ[i], HEAT_SCALE);
            return (
              <rect
                key={`cell${i}`}
                x={cellLeft(cell.col)}
                y={cellTop(cell.row)}
                width={cellPx()}
                height={cellPx()}
                fill={fill}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            );
          })}

          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i).map((i) => {
            if (i === goalIdx || i === trapIdx) return null;
            const cell = cellFromIndex(i);
            const arrow = ACTION_ARROW[ACTIONS[d.policy[i]]];
            return (
              <text
                key={`arrow${i}`}
                x={cellCenterX(cell.col)}
                y={round2(cellCenterY(cell.row) + 4)}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
              >
                {arrow}
              </text>
            );
          })}

          <text x={cellCenterX(START_CELL.col)} y={round2(cellCenterY(START_CELL.row) - 12)} textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">
            S
          </text>
          <text x={cellCenterX(GOAL_CELL.col)} y={round2(cellCenterY(GOAL_CELL.row) + 4)} textAnchor="middle" className="fill-emerald-700 text-[13px] font-bold">
            G
          </text>
          <text x={cellCenterX(TRAP_CELL.col)} y={round2(cellCenterY(TRAP_CELL.row) + 4)} textAnchor="middle" className="fill-red-700 text-[13px] font-bold">
            ×
          </text>

          {currentStep ? (
            <>
              <line
                x1={cellCenterX(cellFromIndex(currentStep.state).col)}
                y1={cellCenterY(cellFromIndex(currentStep.state).row)}
                x2={cellCenterX(cellFromIndex(currentStep.nextState).col)}
                y2={cellCenterY(cellFromIndex(currentStep.nextState).row)}
                stroke={currentStep.explored ? "#d97706" : "#0f172a"}
                strokeWidth={2}
                opacity={0.7}
              />
              <circle
                cx={cellCenterX(cellFromIndex(currentStep.state).col)}
                cy={cellCenterY(cellFromIndex(currentStep.state).row)}
                r={7}
                fill={currentStep.explored ? "#d97706" : "#0f172a"}
                stroke="#fff"
                strokeWidth={1.5}
              />
            </>
          ) : null}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={tex} />
        {!currentStep ? (
          <p className="mt-1 text-xs text-slate-400">再生バーを動かすと、そのステップの数値がここに反映される。</p>
        ) : null}
      </div>

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {stat("学習済みエピソード", String(controls.episodesTrained))}
        {stat("最終エピソード歩数", String(d.lastEpisodeSteps.length || "—"))}
        {stat("直近の合計報酬", d.episodeRewards.length > 0 ? formatNumber(d.episodeRewards[d.episodeRewards.length - 1], 1) : "—")}
        {stat("行動選択", currentStep ? (currentStep.explored ? "探索" : "活用") : "—")}
      </div>

      <Callout
        title={controls.episodesTrained === 0 ? "学習前: Qテーブルはすべて0" : `${controls.episodesTrained}エピソード学習後`}
        body={
          controls.episodesTrained === 0
            ? "まだ1回も学習していないので、矢印（方策）はすべて既定値（同点）、色（Q値）もすべて白いまま。«+10エピソード学習»を押して育て始めよう。"
            : "マスの色が濃い青ほど«そこから先の見込みが良い»、濃い赤ほど«悪い»。矢印は各マスで今のところ最も良いと学習された行動——学習が進むほどゴールへ向かう一本道が浮かび上がり、落とし穴の周りは避けるように矢印が揃っていく。"
        }
        note="εを上げるとランダムな行動（探索）が増え、学習序盤は遠回りしやすくなる代わりに、落とし穴の位置などを«発見»しやすくなる。0に近づけると常に今の最良行動だけを選ぶ（活用）。"
        kind="explain"
      />
    </div>
  );
}
