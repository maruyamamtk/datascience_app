"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { logisticPredict } from "@/lib/stats/logistic";
import { LOGIT_DATA, useLogitStore } from "@/lib/store/qualitative-regression";
import { buildLogitFitFrames } from "./frames";

const STEPS = [0, 5, 15, 40, 120, 400];
const W = 360;
const H = 160;
const PAD = { top: 14, right: 14, bottom: 24, left: 30 };
const X_MIN = -1;
const X_MAX = 5;

/**
 * 勾配上昇法でロジスティック回帰を当てはめるステッパー（描画層）。(b0,b1)=(0,0) から最尤へ登り、
 * シグモイド曲線がデータに馴染む様子をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * フレーム位置は useLogitStore の frame。
 */
export function LogitFitStepper() {
  const index = useLogitStore((s) => s.frame.index);
  const count = useLogitStore((s) => s.frame.count);
  const playing = useLogitStore((s) => s.frame.playing);
  const nextFrame = useLogitStore((s) => s.nextFrame);
  const prevFrame = useLogitStore((s) => s.prevFrame);
  const goToFrame = useLogitStore((s) => s.goToFrame);
  const setPlaying = useLogitStore((s) => s.setPlaying);
  const setFrameCount = useLogitStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildLogitFitFrames(LOGIT_DATA.x, LOGIT_DATA.y, STEPS), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1100,
  });

  const frame = frameAt(frames, index);
  const b0 = frame?.payload?.b0 ?? 0;
  const b1 = frame?.payload?.b1 ?? 0;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toY = (p: number) => PAD.top + (1 - p) * plotH;
  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i === 0 ? "M" : "L"}${toX(x).toFixed(1)},${toY(logisticPredict(x, b0, b1)).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        勾配上昇法でシグモイドをデータに当てはめる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ロジスティック当てはめ"
        data-testid="logit-fit"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        <line x1={PAD.left} y1={toY(1)} x2={W - PAD.right} y2={toY(1)} stroke="#e2e8f0" />
        {LOGIT_DATA.x.map((xi, i) => (
          <circle
            key={i}
            cx={toX(xi)}
            cy={toY(LOGIT_DATA.y[i] === 1 ? 0.97 : 0.03)}
            r={2.6}
            fill={LOGIT_DATA.y[i] === 1 ? "#16a34a" : "#dc2626"}
            opacity={0.55}
          />
        ))}
        <path d={curve} fill="none" stroke="#2563eb" strokeWidth={2.5} />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        反復 {frame?.payload?.step}・b0={formatNumber(b0)}・b1={formatNumber(b1)}・対数尤度=
        {formatNumber(frame?.payload?.logLik ?? 0, 1)}
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
        ▶ 再生で勾配の向きに係数が動き、シグモイドが «0と1の境目»
        に馴染みます。これが最尤によるロジスティック回帰の当てはめ。
      </p>
    </div>
  );
}
