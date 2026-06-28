"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useSufficiencyStore } from "@/lib/store/statistics-sufficiency";
import { buildOrderStatFrames } from "./frames";

// 固定の標本（順序統計量の整列を見せる用）。
const SAMPLE = [7, 2, 9, 4, 2, 6, 1, 8];
const W = 360;
const H = 70;
const PAD = { left: 16, right: 16 };

/**
 * 順序統計量の整列ステッパー（描画層）。標本を昇順に並べ、x₍₁₎（最小）→…→x₍ₙ₎（最大）と
 * 1 つずつ取り出して «並べると見える要約»（最小・中央値・最大）を見せる（アルゴリズム図鑑スタイル）。
 * フレーム位置は useSufficiencyStore の frame。
 */
export function OrderStatStepper() {
  const index = useSufficiencyStore((s) => s.frame.index);
  const count = useSufficiencyStore((s) => s.frame.count);
  const playing = useSufficiencyStore((s) => s.frame.playing);
  const nextFrame = useSufficiencyStore((s) => s.nextFrame);
  const prevFrame = useSufficiencyStore((s) => s.prevFrame);
  const goToFrame = useSufficiencyStore((s) => s.goToFrame);
  const setPlaying = useSufficiencyStore((s) => s.setPlaying);
  const setFrameCount = useSufficiencyStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildOrderStatFrames(SAMPLE), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 750,
  });

  const frame = frameAt(frames, index);
  const sorted = frame?.payload?.sorted ?? [];
  const revealedK = frame?.payload?.k ?? 0;

  const n = sorted.length;
  const cellW = (W - PAD.left - PAD.right) / n;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">標本を昇順に並べる → 順序統計量 x₍ₖ₎</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="順序統計量の整列"
        data-testid="order-stat"
      >
        {sorted.map((v, i) => {
          const revealed = i < revealedK;
          const isCurrent = i === revealedK - 1;
          return (
            <g key={i}>
              <rect
                id={`ord-${i}`}
                x={PAD.left + i * cellW + 2}
                y={20}
                width={cellW - 4}
                height={30}
                rx={4}
                fill={revealed ? (isCurrent ? "#2563eb" : "#bfdbfe") : "#f1f5f9"}
                stroke={isCurrent ? "#1e40af" : "none"}
                strokeWidth={isCurrent ? 2 : 0}
              />
              <text
                x={PAD.left + i * cellW + cellW / 2}
                y={39}
                textAnchor="middle"
                className={`text-[11px] font-bold ${revealed ? (isCurrent ? "fill-white" : "fill-blue-800") : "fill-slate-300"}`}
              >
                {revealed ? v : "?"}
              </text>
              <text
                x={PAD.left + i * cellW + cellW / 2}
                y={62}
                textAnchor="middle"
                className="fill-slate-400 text-[8px]"
              >
                x₍{i + 1}₎
              </text>
            </g>
          );
        })}
      </svg>

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
        ▶ 再生で昇順に 1
        つずつ確定します。最小・最大・中央値・四分位はすべて順序統計量。外れ値に強い «位置»
        の要約です。
      </p>
    </div>
  );
}
