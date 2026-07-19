"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, isHighlighted, StepPlayer, useFramePlayer } from "@/components/viz";
import { ACTION_ARROW, ACTIONS, cellFromIndex, GOAL_CELL, GRID_SIZE, TRAP_CELL } from "@/lib/stats/reinforcement-learning";
import { useQUpdateStepperStore } from "@/lib/store/reinforcement-learning";
import { cellCenterX, cellCenterY, cellLeft, cellPx, cellTop, GRID_PX, round2 } from "./grid-layout";
import { buildQUpdateFrames, Q_STEPPER_ALPHA, Q_STEPPER_GAMMA } from "./qupdate-frames";

const { W, H } = GRID_PX;

// 項id は GridWorldLab（qsa/r/maxq/qold/qnew）と同一ページに同時マウントされるため、
// "s" 接頭辞で名前空間を分離する（同じ id が2つの KaTeX サブツリーに重複するとHTML的に不正になる）。
const FORMULA = `\\text{TD目標: } ${term("sr", "?")} + ${formatNumber(Q_STEPPER_GAMMA, 2)}\\cdot${term(
  "smaxq",
  "?",
)} = ${term("starget", "?")} \\qquad \\text{TD誤差: } ${term("starget2", "?")} - ${term("sqsa", "?")} = ${term(
  "serror",
  "?",
)}`;

const FORMULA2 = `Q(s,a)\\leftarrow ${term("sqsa2", "?")} + ${formatNumber(Q_STEPPER_ALPHA, 2)}\\cdot${term(
  "serror2",
  "?",
)} = ${term("sqnew", "?")}`;

/**
 * 「Q学習の更新式」ステッパー（Level1）: ある程度学習が進んだQテーブルから1エピソードを走らせ、
 * 各ステップで TD目標 → TD誤差 → 更新後のQ値、という導出の流れを数式の項ハイライトで1コマずつ追う。
 * メインの GridWorldLab（Level0）とは別の «専用の空ストア» で frame を持つ（2つ目のStepPlayer, #76）。
 */
export function QUpdateStepper() {
  const index = useQUpdateStepperStore((s) => s.frame.index);
  const count = useQUpdateStepperStore((s) => s.frame.count);
  const playing = useQUpdateStepperStore((s) => s.frame.playing);
  const nextFrame = useQUpdateStepperStore((s) => s.nextFrame);
  const prevFrame = useQUpdateStepperStore((s) => s.prevFrame);
  const goToFrame = useQUpdateStepperStore((s) => s.goToFrame);
  const setPlaying = useQUpdateStepperStore((s) => s.setPlaying);
  const setFrameCount = useQUpdateStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildQUpdateFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const explored = isHighlighted(frame, "explore");

  // 2つの独立した KaTeX サブツリー（TD目標/TD誤差の式と、更新後Qの式）を持つため、
  // それぞれに専用の ref を張る——TermController.setValue/setHighlight は ref のルート配下
  // だけを querySelector で探すため、片方の ref だけで両方の式の項を更新することはできない
  // （1つの ref を使い回すと片方の式が更新されず "?" のまま残る）。
  const mathRef = useRef<MathFormulaHandle>(null);
  const mathRef2 = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m1 = mathRef.current;
    const m2 = mathRef2.current;
    if (!m1 || !m2 || !p) return;
    const u = p.step.update;
    const tone = explored ? "#d97706" : "#2563eb";
    m1.setValue("sr", formatNumber(u.reward, 2));
    m1.setValue("smaxq", formatNumber(u.maxNextQ, 2));
    m1.setValue("starget", formatNumber(u.tdTarget, 2));
    m1.setValue("starget2", formatNumber(u.tdTarget, 2));
    m1.setValue("sqsa", formatNumber(u.qBefore, 2));
    m1.setHighlight("sr", true, "#059669");
    m1.setHighlight("smaxq", true, "#7c3aed");
    m1.setHighlight("starget", true, "#0f172a");
    m1.setHighlight("starget2", true, "#0f172a");
    m1.setHighlight("sqsa", true, tone);
    m1.setValue("serror", formatNumber(u.tdError, 2));
    m1.setHighlight("serror", true, "#b91c1c");

    m2.setValue("sqsa2", formatNumber(u.qBefore, 2));
    m2.setValue("serror2", formatNumber(u.tdError, 2));
    m2.setValue("sqnew", formatNumber(u.qAfter, 2));
    m2.setHighlight("sqsa2", true, tone);
    m2.setHighlight("serror2", true, "#b91c1c");
    m2.setHighlight("sqnew", true, tone);
  }, [p, explored]);

  const goalIdx = GOAL_CELL.row * GRID_SIZE + GOAL_CELL.col;
  const trapIdx = TRAP_CELL.row * GRID_SIZE + TRAP_CELL.col;
  const cur = p ? cellFromIndex(p.step.state) : undefined;
  const nxt = p ? cellFromIndex(p.step.nextState) : undefined;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">Q学習の更新式を1ステップずつ導出する（学習済みQテーブルから続く1エピソード）</p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-xs" role="img" aria-label="現在のステップの状態遷移">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i).map((i) => {
                const cell = cellFromIndex(i);
                const isGoal = i === goalIdx;
                const isTrap = i === trapIdx;
                const isCurrent = i === p.step.state;
                const isNext = i === p.step.nextState;
                const fill = isGoal ? "#bbf7d0" : isTrap ? "#fecaca" : isCurrent ? "#dbeafe" : isNext ? "#e0e7ff" : "#f8fafc";
                return (
                  <rect key={`c${i}`} x={cellLeft(cell.col)} y={cellTop(cell.row)} width={cellPx()} height={cellPx()} fill={fill} stroke="#e2e8f0" />
                );
              })}
              <text x={cellCenterX(GOAL_CELL.col)} y={round2(cellCenterY(GOAL_CELL.row) + 4)} textAnchor="middle" className="fill-emerald-700 text-[12px] font-bold">
                G
              </text>
              <text x={cellCenterX(TRAP_CELL.col)} y={round2(cellCenterY(TRAP_CELL.row) + 4)} textAnchor="middle" className="fill-red-700 text-[12px] font-bold">
                ×
              </text>
              <line
                x1={cellCenterX(cur!.col)}
                y1={cellCenterY(cur!.row)}
                x2={cellCenterX(nxt!.col)}
                y2={cellCenterY(nxt!.row)}
                stroke={explored ? "#d97706" : "#0f172a"}
                strokeWidth={2}
              />
              <circle cx={cellCenterX(cur!.col)} cy={cellCenterY(cur!.row)} r={7} fill={explored ? "#d97706" : "#0f172a"} stroke="#fff" strokeWidth={1.5} />
            </svg>
          </div>

          <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
            <MathFormula ref={mathRef} tex={FORMULA} display={false} />
            <div className="mt-2">
              <MathFormula ref={mathRef2} tex={FORMULA2} display={false} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="行動" value={ACTION_ARROW[ACTIONS[p.step.action]]} />
            <Stat label="選択の種類" value={explored ? "探索（ランダム）" : "活用（貪欲）"} tone={explored ? "amber" : "blue"} />
            <Stat label={`${p.stepNumber} / ${p.totalSteps} 手目`} value={p.step.done ? "終端" : "継続"} />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        オレンジ＝ε-greedyで «探索»（ランダムな行動）を選んだステップ、黒＝«活用»（その時点で最良の行動）。TD誤差（実際に起きたことと現在の予想の差）が0に近づくほど、そのQ値は真の値に収束している。
      </p>
    </div>
  );
}

function Stat({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "amber" }) {
  const bg = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
