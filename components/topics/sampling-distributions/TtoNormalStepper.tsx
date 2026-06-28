"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useSamplingStore } from "@/lib/store/sampling-distributions";
import { buildTtoNormalFrames } from "./frames";

const NUS = [1, 2, 5, 10, 30, 200];
const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };
const XR = 5;

/**
 * t 分布 → 標準正規分布の収束ステッパー（描画層）。自由度 ν を増やすと、裾の重い t が標準正規（赤点線）に
 * 重なる様子をコマ送りで見せる（アルゴリズム図鑑スタイル）。フレーム位置は useSamplingStore の frame。
 */
export function TtoNormalStepper() {
  const index = useSamplingStore((s) => s.frame.index);
  const count = useSamplingStore((s) => s.frame.count);
  const playing = useSamplingStore((s) => s.frame.playing);
  const nextFrame = useSamplingStore((s) => s.nextFrame);
  const prevFrame = useSamplingStore((s) => s.prevFrame);
  const goToFrame = useSamplingStore((s) => s.goToFrame);
  const setPlaying = useSamplingStore((s) => s.setPlaying);
  const setFrameCount = useSamplingStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildTtoNormalFrames(NUS), []);
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
  const tCurve = p?.tCurve ?? [];
  const normal = p?.normal ?? [];

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yMax = 0.42;
  const toX = (x: number) => PAD.left + ((x + XR) / (2 * XR)) * plotW;
  const toY = (y: number) => PAD.top + (1 - Math.min(1, y / yMax)) * plotH;
  const toPath = (c: { x: number; y: number }[]) =>
    c
      .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.x).toFixed(1)},${toY(pt.y).toFixed(1)}`)
      .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        自由度 ν を増やす → t 分布（青）が標準正規（赤点線）に重なる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="t分布から正規への収束"
        data-testid="t-to-normal"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path
          d={toPath(normal)}
          fill="none"
          stroke="#dc2626"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <path d={toPath(tCurve)} fill="none" stroke="#2563eb" strokeWidth={2.5} />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        ν = {p?.nu}・中心の差 {formatNumber(p?.centerGap ?? 0, 4)}
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
        ▶ 再生で ν が増え、裾の重い t が標準正規へ。自由度＝«標本標準偏差 s の確からしさ»。n
        が大きいと s≈σ で t≈正規。
      </p>
    </div>
  );
}
