"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useContinuousStore } from "@/lib/store/continuous-distributions";
import { buildGammaFrames } from "./frames";

const THETA = 1;
const MAX_K = 6;
const W = 360;
const H = 140;
const PAD = { top: 12, right: 14, bottom: 22, left: 14 };
// 全フレーム共通の固定軸（最大 k のレンジに合わせ、提示中に軸が動かない）。
const X_MAX = MAX_K * THETA + 4 * Math.sqrt(MAX_K) * THETA;

/**
 * 「指数分布を k 個足すとガンマ分布になる」ステッパー（描画層）。形状 k を 1→MAX_K と増やし、
 * k=1 の指数（右肩下がり）が k の増加とともに釣鐘型へ近づく様子をコマ送りで見せる
 * （アルゴリズム図鑑スタイル, 中心極限定理の芽）。フレーム位置は useContinuousStore の frame。
 */
export function GammaBuildStepper() {
  const index = useContinuousStore((s) => s.frame.index);
  const count = useContinuousStore((s) => s.frame.count);
  const playing = useContinuousStore((s) => s.frame.playing);
  const nextFrame = useContinuousStore((s) => s.nextFrame);
  const prevFrame = useContinuousStore((s) => s.prevFrame);
  const goToFrame = useContinuousStore((s) => s.goToFrame);
  const setPlaying = useContinuousStore((s) => s.setPlaying);
  const setFrameCount = useContinuousStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildGammaFrames(THETA, MAX_K), []);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 950,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const curve = p?.curve ?? [];

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // y スケールは k=1（指数, x=0 で最大=1/θ）を基準に固定。
  const yMax = 1 / THETA;
  const toX = (x: number) => PAD.left + (x / X_MAX) * plotW;
  const toY = (y: number) => PAD.top + (1 - Math.min(1, y / yMax)) * plotH;

  const path = curve
    .filter((pt) => pt.x <= X_MAX)
    .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.x).toFixed(1)},${toY(pt.y).toFixed(1)}`)
    .join(" ");

  const meanX = toX(Math.min(X_MAX, p?.mean ?? 0));

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        指数分布を k 個足す → Gamma(k, θ={THETA})（k=1 は指数、k 増で釣鐘型へ）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ガンマ分布の構築"
        data-testid="gamma-build"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} />
        <line
          x1={meanX}
          y1={PAD.top}
          x2={meanX}
          y2={toY(0)}
          stroke="#7c3aed"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text
          x={meanX}
          y={PAD.top - 2}
          textAnchor="middle"
          className="fill-violet-700 text-[10px] font-semibold"
        >
          μ=kθ={formatNumber(p?.mean ?? 0)}
        </text>
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        形状 k = {p?.k}（指数を {p?.k} 個足した和）
      </p>

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

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で k が増え、右肩下がりの指数が «山»
        のあるガンマへ。歪んだ分布の和でも、足すほど釣鐘型に近づく（中心極限定理の芽）。
      </p>
    </div>
  );
}
