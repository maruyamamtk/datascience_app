"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useMomentStore } from "@/lib/store/distribution-characteristics";
import { buildVarianceFrames } from "./frames";

const AXIS_MIN = -1;
const AXIS_MAX = 13;
const W = 360;
const H = 96;
const PAD_X = 16;
const LINE_Y = 40;
const PLOT_W = W - PAD_X * 2;

/**
 * 分散の «1 点ずつ» 積み上げステッパー（描画層）。数直線上で着目点 xᵢ と平均 μ の偏差を線で示し、
 * 偏差平方を 1 つずつ加えて最後に n で割ると母分散になる過程をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 操作値（points）は useMomentStore が single source of truth、フレーム位置も同ストアの frame。
 */
export function VarianceStepper() {
  const points = useMomentStore((s) => s.controls.points);
  const index = useMomentStore((s) => s.frame.index);
  const count = useMomentStore((s) => s.frame.count);
  const playing = useMomentStore((s) => s.frame.playing);
  const nextFrame = useMomentStore((s) => s.nextFrame);
  const prevFrame = useMomentStore((s) => s.prevFrame);
  const goToFrame = useMomentStore((s) => s.goToFrame);
  const setPlaying = useMomentStore((s) => s.setPlaying);
  const setFrameCount = useMomentStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildVarianceFrames(points), [points]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 900,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const mu = p?.mu ?? 0;

  const toX = (v: number) => PAD_X + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_W;
  const muX = toX(mu);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        分散 σ² = (1/n)Σ(xᵢ−μ)² を 1 点ずつ組み立てる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="分散を1点ずつ積み上げる"
        data-testid="variance-stepper"
      >
        <line
          x1={PAD_X}
          y1={LINE_Y}
          x2={W - PAD_X}
          y2={LINE_Y}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
        {/* 平均 μ の縦線 */}
        <line
          x1={muX}
          y1={LINE_Y - 24}
          x2={muX}
          y2={LINE_Y + 8}
          stroke="#7c3aed"
          strokeWidth={1.5}
        />
        <text
          x={muX}
          y={LINE_Y + 22}
          textAnchor="middle"
          className="fill-violet-700 text-[10px] font-semibold"
        >
          μ={formatNumber(mu)}
        </text>

        {/* 全点（提示済みは色、未提示は淡色）。着目点を強調＋偏差線。 */}
        {points.map((x, i) => {
          const revealed = i <= (p?.i ?? -1);
          const isCurrent = i === p?.i;
          return (
            <g key={i}>
              {isCurrent && (
                <line
                  x1={muX}
                  y1={LINE_Y - 14}
                  x2={toX(x)}
                  y2={LINE_Y - 14}
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                />
              )}
              <circle
                cx={toX(x)}
                cy={LINE_Y - 14}
                r={isCurrent ? 7 : 5}
                fill={revealed ? (isCurrent ? "#2563eb" : "#0f172a") : "#cbd5e1"}
              />
            </g>
          );
        })}
      </svg>

      {/* 途中経過の数値 */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
        <span className="font-mono">偏差 (x−μ) = {formatNumber(p?.dev ?? 0)}</span>
        <span className="font-mono">偏差² = {formatNumber(p?.sq ?? 0)}</span>
        <span className="font-mono text-slate-800">
          Σ偏差² = {formatNumber(p?.runningSum ?? 0)}
        </span>
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

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で偏差平方が 1 つずつ加算されます。上のラボで点を動かしてから見ると、外れた点ほど
        偏差平方が大きく σ² を押し上げることが分かります。
      </p>
    </div>
  );
}
