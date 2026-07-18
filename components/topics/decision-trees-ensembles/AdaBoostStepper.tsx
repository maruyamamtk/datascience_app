"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { CLASS_TRAIN, useAdaBoostStepperStore } from "@/lib/store/decision-trees-ensembles";
import { buildAdaBoostFrames } from "./boosting-frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 300;
const PAD = 22;
const px = (v: number) => round2(PAD + v * (W - 2 * PAD));
const py = (v: number) => round2(PAD + (1 - v) * (H - 2 * PAD));

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_BG = { 0: "#dbeafe", 1: "#fef3c7" } as const;
const BOUNDARY_RESOLUTION = 22;

/**
 * AdaBoost ステッパー（Level3）。標本重み（バブルの大きさ）を持ちながら決定株を1本ずつ逐次追加し、
 * 誤分類した点（赤いリング）の重みが次ラウンドで増える様子と、α重み付き多数決の決定境界が
 * ラウンドを追うごとに波打つ真の境界へ近づく様子をコマ送りで見せる。
 */
export function AdaBoostStepper() {
  const index = useAdaBoostStepperStore((s) => s.frame.index);
  const count = useAdaBoostStepperStore((s) => s.frame.count);
  const playing = useAdaBoostStepperStore((s) => s.frame.playing);
  const nextFrame = useAdaBoostStepperStore((s) => s.nextFrame);
  const prevFrame = useAdaBoostStepperStore((s) => s.prevFrame);
  const goToFrame = useAdaBoostStepperStore((s) => s.goToFrame);
  const setPlaying = useAdaBoostStepperStore((s) => s.setPlaying);
  const setFrameCount = useAdaBoostStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildAdaBoostFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1100 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const round = p ? p.rounds[p.round] : undefined;
  const cellSize = round2((W - 2 * PAD) / BOUNDARY_RESOLUTION);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        AdaBoost：決定株（深さ1の木）を{p?.rounds.length ?? 0}本、標本重みを更新しながら逐次追加する
      </p>

      {p && round ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="AdaBoostの標本重みと決定株">
              {p.boundary.map((cell, i) => (
                <rect
                  key={`cell${i}`}
                  x={round2(px(cell.x1) - cellSize / 2)}
                  y={round2(py(cell.x2) - cellSize / 2)}
                  width={cellSize}
                  height={cellSize}
                  fill={LABEL_BG[cell.label]}
                />
              ))}
              {round.stump.feature === 0 ? (
                <line x1={px(round.stump.threshold)} y1={py(1)} x2={px(round.stump.threshold)} y2={py(0)} stroke="#d97706" strokeWidth={2.2} />
              ) : (
                <line x1={px(0)} y1={py(round.stump.threshold)} x2={px(1)} y2={py(round.stump.threshold)} stroke="#d97706" strokeWidth={2.2} />
              )}
              <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" className="stroke-slate-300" />
              {CLASS_TRAIN.map((pt, i) => {
                const weight = round.weightsBefore[i];
                const r = round2(2 + weight * 220);
                const wrong = round.misclassified[i];
                return (
                  <g key={`p${i}`}>
                    {wrong ? <circle cx={px(pt.x1)} cy={py(pt.x2)} r={r + 2.2} fill="none" stroke="#dc2626" strokeWidth={1.4} /> : null}
                    <circle cx={px(pt.x1)} cy={py(pt.x2)} r={r} fill={LABEL_FILL[pt.label]} stroke="#fff" strokeWidth={0.6} />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat value={`${(round.weightedError * 100).toFixed(1)}%`} label="加重誤差" tone="red" />
            <Stat value={round.alpha.toFixed(2)} label="発言権 α" tone="amber" />
            <Stat value={String(p.misclassifiedCount)} label="誤分類点（赤丸）" tone="blue" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生でラウンドが進みます。バブルの大きさ＝標本重み、赤いリング＝そのラウンドの株が誤分類した点。
        誤分類された点は次ラウンドでバブルが大きくなり、次の決定株はそこを重点的に正しく分けようとする——バギングの«並列»と対照的な«逐次»学習。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "red" | "amber" | "blue" }) {
  const bg = { red: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
