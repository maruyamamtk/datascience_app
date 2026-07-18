"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, isHighlighted, useFramePlayer } from "@/components/viz";
import { useKnnStepperStore } from "@/lib/store/naive-bayes-knn";
import { buildKnnFrames, KNN_STEP_K } from "./knn-frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 260;
const PAD = 22;
const SCALE = W - 2 * PAD;
const px = (v: number) => round2(PAD + v * SCALE);
const py = (v: number) => round2(PAD + (1 - v) * SCALE);

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;

/**
 * 「k近傍探索」ステッパー（Level2）。新しい点から距離が近い順に訓練点を1つずつ調べ、
 * k本目までを近傍として線で結び採用する過程をコマ送りにする——CARTの「全候補を試す」
 * ステッパー（SplitFinderStepper, #76）と同じ «距離順に1つずつ見せる» 発想。
 */
export function KnnStepper() {
  const index = useKnnStepperStore((s) => s.frame.index);
  const count = useKnnStepperStore((s) => s.frame.count);
  const playing = useKnnStepperStore((s) => s.frame.playing);
  const nextFrame = useKnnStepperStore((s) => s.nextFrame);
  const prevFrame = useKnnStepperStore((s) => s.prevFrame);
  const goToFrame = useKnnStepperStore((s) => s.goToFrame);
  const setPlaying = useKnnStepperStore((s) => s.setPlaying);
  const setFrameCount = useKnnStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildKnnFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 650 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const isNeighborFrame = isHighlighted(frame, "neighbor");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        k近傍探索：{p?.points.length ?? 0}点から、新しい点に近い順に1点ずつ調べ、k={KNN_STEP_K}本目までを近傍に採用する
      </p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="k近傍探索の過程">
              <rect x={PAD} y={PAD} width={SCALE} height={SCALE} fill="none" className="stroke-slate-300" />

              {p.order.slice(0, p.revealed).map((n, i) => {
                const withinK = i < p.k;
                return (
                  <line
                    key={`nl${n.index}`}
                    x1={px(p.query.x1)}
                    y1={py(p.query.x2)}
                    x2={px(n.point.x1)}
                    y2={py(n.point.x2)}
                    stroke={withinK ? "#0f172a" : "#cbd5e1"}
                    strokeWidth={withinK ? 1.4 : 0.8}
                    strokeDasharray={withinK ? undefined : "2 2"}
                    opacity={withinK ? 0.8 : 0.5}
                  />
                );
              })}

              {p.points.map((pt, i) => {
                const rank = p.order.findIndex((n) => n.index === i);
                const revealedYet = rank < p.revealed;
                const withinK = rank < p.k;
                return (
                  <circle
                    key={`p${i}`}
                    cx={px(pt.x1)}
                    cy={py(pt.x2)}
                    r={revealedYet && withinK ? 5 : 3.4}
                    fill={LABEL_FILL[pt.label]}
                    stroke={revealedYet && withinK ? "#0f172a" : "#fff"}
                    strokeWidth={revealedYet && withinK ? 1.8 : 0.8}
                    opacity={revealedYet ? 1 : 0.3}
                  />
                );
              })}

              <rect
                x={round2(px(p.query.x1) - 6)}
                y={round2(py(p.query.x2) - 6)}
                width={12}
                height={12}
                fill="#0f172a"
                stroke="#fff"
                strokeWidth={1.5}
                transform={`rotate(45 ${px(p.query.x1)} ${py(p.query.x2)})`}
              />
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat value={`${p.revealed}/${p.points.length}`} label="調べた点数" tone="blue" />
            <Stat value={`${p.votes.label0} / ${p.votes.label1}`} label="票（クラス0/1）" tone={isNeighborFrame ? "emerald" : "amber"} />
            <Stat value={String(p.k)} label="k（固定）" tone="blue" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生ですべての点を距離順に1つずつ試します。黒い実線＝近傍（k本以内）として採用、灰色の破線＝それより遠く不採用。最後のコマで多数決の結果を確認しよう。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "blue" | "amber" | "emerald" }) {
  const bg = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
