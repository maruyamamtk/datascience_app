"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useMassStore } from "@/lib/store/probability-distributions-mgf";
import { buildCdfFrames } from "./frames";

const W = 360;
const H = 120;
const PAD = { top: 10, right: 12, bottom: 22, left: 28 };

/**
 * 確率関数 → 累積分布関数の «積み上げ» ステッパー（描画層）。P(X=k) を 1 本ずつ累積に加え、
 * CDF の階段が右肩上がりに 1 へ到達する様子をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 操作値（n・p）は useMassStore が single source of truth、フレーム位置も同ストアの frame。
 */
export function CdfStepper() {
  const pmf = useMassStore((s) => s.derived.pmf);
  const index = useMassStore((s) => s.frame.index);
  const count = useMassStore((s) => s.frame.count);
  const playing = useMassStore((s) => s.frame.playing);
  const nextFrame = useMassStore((s) => s.nextFrame);
  const prevFrame = useMassStore((s) => s.prevFrame);
  const goToFrame = useMassStore((s) => s.goToFrame);
  const setPlaying = useMassStore((s) => s.setPlaying);
  const setFrameCount = useMassStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildCdfFrames(pmf), [pmf]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 650,
  });

  const frame = frameAt(frames, index);
  const curK = frame?.payload?.k ?? 0;
  const runningCdf = frame?.payload?.cdf ?? 0;

  const cells = pmf.length;
  const plotW = W - PAD.left - PAD.right;
  const bandW = plotW / cells;
  const pmfMax = Math.max(...pmf, 0.0001);
  const innerW = bandW * 0.7;
  const cdfY = (f: number) => PAD.top + (1 - f) * (H - PAD.top - PAD.bottom);

  // 累積（提示済み）を再構成。
  let acc = 0;
  const cumUpToK = pmf.map((pk, k) => {
    if (k <= curK) acc += pk;
    return acc;
  });

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        P(X=k) を 1 本ずつ積んで F(k)=P(X≤k) を作る
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="CDFの積み上げ"
        data-testid="cdf-stepper"
      >
        <line x1={PAD.left} y1={cdfY(1)} x2={W - PAD.right} y2={cdfY(1)} stroke="#e2e8f0" />
        {/* 確率関数の棒（提示済みは青、未提示は淡色、いまの k は赤枠） */}
        {pmf.map((pk, k) => {
          const h = (pk / pmfMax) * (H - PAD.top - PAD.bottom);
          const revealed = k <= curK;
          return (
            <rect
              key={k}
              x={PAD.left + k * bandW + bandW * 0.15}
              y={H - PAD.bottom - h}
              width={innerW}
              height={h}
              fill={revealed ? "#bfdbfe" : "#f1f5f9"}
              stroke={k === curK ? "#dc2626" : "none"}
              strokeWidth={k === curK ? 2 : 0}
            />
          );
        })}
        {/* 累積の階段（提示済みのみ） */}
        {cumUpToK.map((f, k) =>
          k <= curK ? (
            <line
              key={k}
              x1={PAD.left + k * bandW}
              y1={cdfY(f)}
              x2={PAD.left + (k + 1) * bandW}
              y2={cdfY(f)}
              stroke="#2563eb"
              strokeWidth={2.5}
            />
          ) : null,
        )}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        F({curK}) = P(X≤{curK}) = {formatNumber(runningCdf * 100, 1)}%
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
        ▶ 再生で確率が積み上がり、階段が必ず 1 まで上ります（確率の総和＝1）。上のラボで n・p
        を変えると形が変わります。
      </p>
    </div>
  );
}
