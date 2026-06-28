"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { histogram } from "@/lib/stats/histogram";
import { useEstPropStore } from "@/lib/store/point-estimation-properties";
import { buildConsistencyFrames } from "./frames";

const NS = [3, 8, 20, 60, 200];
const W = 360;
const H = 140;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };
const AXIS_MIN = 0;
const AXIS_MAX = 10;
const BINS = 34;

/**
 * 一致性ステッパー（描画層）。n を増やすと不偏分散の標本分布が真値 σ² の一点に «潰れていく» 様子を
 * コマ送りで見せる（アルゴリズム図鑑スタイル）。フレーム位置は useEstPropStore の frame。
 */
export function ConsistencyStepper() {
  const index = useEstPropStore((s) => s.frame.index);
  const count = useEstPropStore((s) => s.frame.count);
  const playing = useEstPropStore((s) => s.frame.playing);
  const nextFrame = useEstPropStore((s) => s.nextFrame);
  const prevFrame = useEstPropStore((s) => s.prevFrame);
  const goToFrame = useEstPropStore((s) => s.goToFrame);
  const setPlaying = useEstPropStore((s) => s.setPlaying);
  const setFrameCount = useEstPropStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildConsistencyFrames(NS, 2, 1500), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1000,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const trueVar = p?.trueVar ?? 4;

  const hist = useMemo(
    () => histogram(p?.estimates ?? [], { min: AXIS_MIN, max: AXIS_MAX, bins: BINS }),
    [p],
  );
  const maxCount = Math.max(...hist.map((b) => b.count), 1);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        n を増やす → 不偏分散の標本分布が真値 σ²={trueVar} の一点へ集中（一致性）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="一致性"
        data-testid="consistency"
      >
        {hist.map((b, i) => (
          <rect
            key={i}
            x={toX(b.x0)}
            y={toY(b.count)}
            width={barW}
            height={toY(0) - toY(b.count)}
            fill="#2563eb"
            opacity={0.5}
          />
        ))}
        <line
          x1={toX(trueVar)}
          y1={PAD.top}
          x2={toX(trueVar)}
          y2={toY(0)}
          stroke="#16a34a"
          strokeWidth={2}
        />
        <text
          x={toX(trueVar)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-green-700 text-[10px] font-semibold"
        >
          σ²={trueVar}
        </text>
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        n = {p?.n}・推定量の分散 {formatNumber(p?.variance ?? 0)}
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
        ▶ 再生で n が増え、標本分布が真値に «潰れて» いきます（バイアスも分散も 0
        へ）。これが一致性。
      </p>
    </div>
  );
}
