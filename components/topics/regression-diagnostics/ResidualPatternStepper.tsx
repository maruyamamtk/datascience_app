"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useDiagStore } from "@/lib/store/regression-diagnostics";
import { buildPatternFrames } from "./frames";

const W = 360;
const H = 130;
const PAD = { top: 12, right: 12, bottom: 24, left: 28 };

/**
 * 残差プロットの «パターン図鑑» ステッパー（描画層）。良い当てはめ→非線形→不等分散→外れ値 と
 * 残差プロット（横=予測値, 縦=残差）の形を切り替えて «何が崩れているか» を見せる（アルゴリズム図鑑スタイル）。
 * フレーム位置は useDiagStore の frame。
 */
export function ResidualPatternStepper() {
  const index = useDiagStore((s) => s.frame.index);
  const count = useDiagStore((s) => s.frame.count);
  const playing = useDiagStore((s) => s.frame.playing);
  const nextFrame = useDiagStore((s) => s.nextFrame);
  const prevFrame = useDiagStore((s) => s.prevFrame);
  const goToFrame = useDiagStore((s) => s.goToFrame);
  const setPlaying = useDiagStore((s) => s.setPlaying);
  const setFrameCount = useDiagStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildPatternFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1500,
  });

  const frame = frameAt(frames, index);
  const points = frame?.payload?.points ?? [];

  const fs = points.map((p) => p.fitted);
  const rs = points.map((p) => p.residual);
  const fMin = Math.min(...fs, 0);
  const fMax = Math.max(...fs, 1);
  const rAbs = Math.max(...rs.map((r) => Math.abs(r)), 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - fMin) / (fMax - fMin || 1)) * plotW;
  const toY = (r: number) => PAD.top + (1 - (r + rAbs) / (2 * rAbs)) * plotH;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        残差プロット図鑑（横=予測値 / 縦=残差）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="残差プロット"
        data-testid="residual-pattern"
      >
        {/* 残差0の基準線 */}
        <line
          x1={PAD.left}
          y1={toY(0)}
          x2={W - PAD.right}
          y2={toY(0)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={PAD.left - 4}
          y={toY(0) + 3}
          textAnchor="end"
          className="fill-slate-400 text-[8px]"
        >
          0
        </text>
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.fitted)}
            cy={toY(p.residual)}
            r={2.6}
            fill="#2563eb"
            opacity={0.6}
          />
        ))}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">{frame?.payload?.label}</p>

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
        ▶ 良い当てはめ → 非線形 → 不等分散 → 外れ値。残差の «模様»
        で前提の崩れを読み取ります（良い当てはめは模様なし）。
      </p>
    </div>
  );
}
