"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { logLikCurve } from "@/lib/stats/estimation";
import { ESTIMATION_SAMPLE, useEstimationStore } from "@/lib/store/estimation-methods";
import { buildAscentFrames } from "./frames";

const W = 360;
const H = 150;
const PAD = { top: 12, right: 14, bottom: 24, left: 14 };
const LO = 0.1;
const HI = 1.8;
const START = 0.2;
const LR = 0.2; // 安定領域 lr<2/n（n=8 → <0.25）
const ITERS = 24;

/**
 * 勾配上昇法で対数尤度の «頂上»（最尤推定量）まで 1 ステップずつ登るステッパー（描画層）。
 * 各ステップで現在地が対数尤度曲線上を勾配の向きに動き、頂上で勾配 0 になる（アルゴリズム図鑑スタイル）。
 * フレーム位置は useEstimationStore の frame。
 */
export function GradientAscentStepper() {
  const index = useEstimationStore((s) => s.frame.index);
  const count = useEstimationStore((s) => s.frame.count);
  const playing = useEstimationStore((s) => s.frame.playing);
  const nextFrame = useEstimationStore((s) => s.nextFrame);
  const prevFrame = useEstimationStore((s) => s.prevFrame);
  const goToFrame = useEstimationStore((s) => s.goToFrame);
  const setPlaying = useEstimationStore((s) => s.setPlaying);
  const setFrameCount = useEstimationStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildAscentFrames(ESTIMATION_SAMPLE, START, LR, ITERS), []);
  const curve = useMemo(() => logLikCurve(ESTIMATION_SAMPLE, LO, HI, 120), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 600,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const lambda = p?.lambda ?? START;
  const mle = p?.mle ?? 0;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (l: number) => PAD.left + ((l - LO) / (HI - LO)) * plotW;
  const toY = (lik: number) => PAD.top + (1 - lik) * plotH;
  const path = curve
    .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c.lambda).toFixed(1)},${toY(c.lik).toFixed(1)}`)
    .join(" ");
  const nowLik = curve.reduce((best, c) =>
    Math.abs(c.lambda - lambda) < Math.abs(best.lambda - lambda) ? c : best,
  ).lik;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        勾配上昇法で対数尤度の頂上（最尤推定量）へ登る
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="勾配上昇法"
        data-testid="ascent"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} />
        <line
          x1={toX(mle)}
          y1={PAD.top}
          x2={toX(mle)}
          y2={toY(0)}
          stroke="#dc2626"
          strokeWidth={1.2}
          strokeDasharray="3 2"
        />
        <circle id={`step-${index}`} cx={toX(lambda)} cy={toY(nowLik)} r={5} fill="#0891b2" />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        λ = {formatNumber(lambda, 3)}・勾配 {formatNumber(p?.score ?? 0)}・λ̂ ={" "}
        {formatNumber(mle, 3)}
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
        ▶ 再生で勾配の向きに λ が動き、頂上（勾配 0）に到達します。これが «尤度を最大化»
        する数値計算の中身。
      </p>
    </div>
  );
}
