"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, isHighlighted, useFramePlayer } from "@/components/viz";
import { STEP_DEGREE, STEP_M, useLearningFrameworkStore } from "@/lib/store/learning-framework";
import { buildBiasVarianceFrames } from "./frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 340;
const H = 220;
const PADL = 28;
const PADR = 10;
const PADT = 12;
const PADB = 24;
const Y_LO = -1.9;
const Y_HI = 1.9;
const fx = (x: number) => round2(PADL + x * (W - PADL - PADR));
const fy = (v: number) => {
  const c = Math.max(Y_LO, Math.min(Y_HI, v));
  return round2(PADT + ((Y_HI - c) / (Y_HI - Y_LO)) * (H - PADT - PADB));
};
type XY = { x: number; y: number };
const path = (pts: XY[]) => pts.map((p) => `${fx(p.x)},${fy(p.y)}`).join(" ");

/**
 * 「バイアス分散分解」ステッパー（描画層）。同じ真の関数から取ったデータを再標本（ブートストラップ）
 * するたびに次数 STEP_DEGREE の複雑なモデルをフィットし、1 本ずつ重ねて «分散»（ばらつき）を見せる。
 * 最終コマで平均フィット（太線＝期待予測）と真の関数のズレ＝«バイアス» を示す。フレーム位置は共有ストア。
 */
export function BiasVarianceStepper() {
  const index = useLearningFrameworkStore((s) => s.frame.index);
  const count = useLearningFrameworkStore((s) => s.frame.count);
  const playing = useLearningFrameworkStore((s) => s.frame.playing);
  const nextFrame = useLearningFrameworkStore((s) => s.nextFrame);
  const prevFrame = useLearningFrameworkStore((s) => s.prevFrame);
  const goToFrame = useLearningFrameworkStore((s) => s.goToFrame);
  const setPlaying = useLearningFrameworkStore((s) => s.setPlaying);
  const setFrameCount = useLearningFrameworkStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBiasVarianceFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1200 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const meanOn = isHighlighted(frame, "mean");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        バイアス分散分解：同じ真の関数から取ったデータを再標本し、次数 {STEP_DEGREE} の複雑なモデルを {STEP_M} 回フィット
      </p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-lg" role="img" aria-label="ブートストラップごとのフィットのばらつき">
              {[-1, 0, 1].map((v) => (
                <line key={`g${v}`} x1={PADL} y1={fy(v)} x2={W - PADR} y2={fy(v)} className="stroke-slate-100" />
              ))}
              {/* 真の関数 */}
              <polyline points={path(p.truthCurve)} fill="none" className="stroke-slate-800" strokeWidth={1.6} strokeDasharray="4 3" opacity={0.7} />
              {/* 各ブートストラップのフィット（薄く重ねる＝分散） */}
              {p.drawnFits.map((fit, i) => (
                <polyline
                  key={`f${i}`}
                  points={path(fit)}
                  fill="none"
                  className="stroke-blue-500"
                  strokeWidth={1}
                  opacity={meanOn ? 0.28 : 0.55}
                />
              ))}
              {/* 平均フィット（最終コマ） */}
              {p.meanFit ? (
                <polyline points={path(p.meanFit)} fill="none" className="stroke-rose-600" strokeWidth={2.6} />
              ) : null}
              <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
                破線=真の関数, 青=各フィット, {p.meanFit ? "赤=平均フィット" : "…"}
              </text>
            </svg>
          </div>

          {p.showDecomp && p.avgBias2 !== null && p.avgVariance !== null ? (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Stat value={p.avgBias2.toFixed(3)} label="バイアス²（平均のズレ）" tone="amber" />
              <Stat value={p.avgVariance.toFixed(3)} label="分散（フィットの散らばり）" tone="blue" />
              <Stat value={(p.avgBias2 + p.avgVariance).toFixed(3)} label="≈ 平均二乗誤差" tone="rose" />
            </div>
          ) : null}
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で 1 本ずつフィットが重なります。複雑なモデルはデータの小さな違いで大きく散る（＝
        <span className="font-semibold">分散</span>）。最後のコマの平均フィット（赤）が真の関数（破線）にどれだけ近いかが
        <span className="font-semibold">バイアス</span>。汎化誤差 ≈ バイアス² ＋ 分散。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "amber" | "blue" | "rose" }) {
  const bg = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
