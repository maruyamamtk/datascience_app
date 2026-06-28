"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { stdNormalPdf } from "@/lib/stats/asymptotics";
import { histogram } from "@/lib/stats/histogram";
import { useAsymptoticStore } from "@/lib/store/asymptotic-properties";
import { buildAsymptoticFrames } from "./frames";

const NS = [5, 15, 40, 100, 400];
const TRUE_LAMBDA = 1.5;
const W = 360;
const H = 140;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };
const AXIS_MIN = 0;
const AXIS_MAX = 4;
const BINS = 36;

/**
 * 最尤推定量の漸近正規性ステッパー（描画層）。n を増やすと λ̂ の標本分布が N(λ, λ²/n) の正規曲線に
 * 重なる様子をコマ送りで見せる（アルゴリズム図鑑スタイル）。フレーム位置は useAsymptoticStore の frame。
 */
export function AsymptoticStepper() {
  const index = useAsymptoticStore((s) => s.frame.index);
  const count = useAsymptoticStore((s) => s.frame.count);
  const playing = useAsymptoticStore((s) => s.frame.playing);
  const nextFrame = useAsymptoticStore((s) => s.nextFrame);
  const prevFrame = useAsymptoticStore((s) => s.prevFrame);
  const goToFrame = useAsymptoticStore((s) => s.goToFrame);
  const setPlaying = useAsymptoticStore((s) => s.setPlaying);
  const setFrameCount = useAsymptoticStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildAsymptoticFrames(NS, TRUE_LAMBDA, 2000), []);
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
  const trials = p?.estimates.length ?? 1;

  const hist = useMemo(
    () => histogram(p?.estimates ?? [], { min: AXIS_MIN, max: AXIS_MAX, bins: BINS }),
    [p],
  );
  const maxCount = Math.max(...hist.map((b) => b.count), 1);
  const binW = (AXIS_MAX - AXIS_MIN) / BINS;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;

  const sd = p?.asympSd || 1e-6;
  const normalPath = Array.from({ length: 101 }, (_, i) => {
    const x = AXIS_MIN + (i / 100) * (AXIS_MAX - AXIS_MIN);
    const density = stdNormalPdf((x - TRUE_LAMBDA) / sd) / sd;
    return `${i === 0 ? "M" : "L"}${toX(x).toFixed(1)},${toY(density * trials * binW).toFixed(1)}`;
  }).join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        n を増やす → λ̂ の標本分布（青）が漸近正規 N(λ, λ²/n)（赤）へ重なる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="漸近正規性の収束"
        data-testid="asymptotic-step"
      >
        {hist.map((b, i) => (
          <rect
            key={i}
            x={toX(b.x0)}
            y={toY(b.count)}
            width={barW}
            height={toY(0) - toY(b.count)}
            fill="#2563eb"
            opacity={0.45}
          />
        ))}
        <path d={normalPath} fill="none" stroke="#dc2626" strokeWidth={2} />
        <line
          x1={toX(TRUE_LAMBDA)}
          y1={PAD.top}
          x2={toX(TRUE_LAMBDA)}
          y2={toY(0)}
          stroke="#16a34a"
          strokeWidth={2}
        />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        n = {p?.n}・漸近SD {formatNumber(p?.asympSd ?? 0, 3)}・実測SD{" "}
        {formatNumber(p?.empiricalSd ?? 0, 3)}
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
        ▶ 再生で n が増え、右に歪んだ λ̂
        の分布が左右対称な正規へ。分散はフィッシャー情報量の逆数で決まります。
      </p>
    </div>
  );
}
