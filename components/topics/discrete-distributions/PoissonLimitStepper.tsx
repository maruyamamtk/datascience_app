"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useDiscreteStore } from "@/lib/store/discrete-distributions";
import { buildPoissonLimitFrames } from "./frames";

const LAMBDA = 4;
const NS = [2, 5, 10, 25, 100, 1000];
const MAX_K = 12;
const W = 360;
const H = 130;
const PAD = { top: 10, right: 12, bottom: 22, left: 28 };

/**
 * 二項分布 → ポアソン分布の収束ステッパー（描画層）。np=λ を固定したまま n を増やすと、
 * 二項 Bin(n, λ/n) の棒がポアソン Po(λ) の点線に重なっていく様子をコマ送りで見せる
 * （アルゴリズム図鑑スタイル）。フレーム位置は useDiscreteStore の frame。
 */
export function PoissonLimitStepper() {
  const index = useDiscreteStore((s) => s.frame.index);
  const count = useDiscreteStore((s) => s.frame.count);
  const playing = useDiscreteStore((s) => s.frame.playing);
  const nextFrame = useDiscreteStore((s) => s.nextFrame);
  const prevFrame = useDiscreteStore((s) => s.prevFrame);
  const goToFrame = useDiscreteStore((s) => s.goToFrame);
  const setPlaying = useDiscreteStore((s) => s.setPlaying);
  const setFrameCount = useDiscreteStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildPoissonLimitFrames(LAMBDA, NS, MAX_K), []);

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
  const binom = p?.binom ?? [];
  const poisson = p?.poisson ?? [];

  const cells = MAX_K + 1;
  const plotW = W - PAD.left - PAD.right;
  const bandW = plotW / cells;
  const ymax = Math.max(...binom, ...poisson, 0.0001);
  const toX = (k: number) => PAD.left + k * bandW;
  const toY = (d: number) => PAD.top + (1 - d / ymax) * (H - PAD.top - PAD.bottom);

  const poissonPath = poisson
    .map((d, k) => `${k === 0 ? "M" : "L"}${(toX(k) + bandW / 2).toFixed(1)},${toY(d).toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        np=λ={LAMBDA} を固定して n を増やす → 二項（青棒）がポアソン（赤点線）に重なる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="二項からポアソンへの収束"
        data-testid="poisson-limit"
      >
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
        />
        {/* 二項の棒 */}
        {binom.map((d, k) => {
          const h = H - PAD.bottom - toY(d);
          return (
            <rect
              key={k}
              x={toX(k) + bandW * 0.15}
              y={toY(d)}
              width={Math.max(1, bandW * 0.7)}
              height={Math.max(0, h)}
              fill="#2563eb"
              opacity={0.65}
            />
          );
        })}
        {/* ポアソンの点線 */}
        <path d={poissonPath} fill="none" stroke="#dc2626" strokeWidth={2} strokeDasharray="3 2" />
        {poisson.map((d, k) => (
          <circle key={k} cx={toX(k) + bandW / 2} cy={toY(d)} r={2} fill="#dc2626" />
        ))}
        {[0, 4, 8, 12].map((k) => (
          <text
            key={k}
            x={toX(k) + bandW / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[9px]"
          >
            {k}
          </text>
        ))}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        n = {p?.n}・p = {formatNumber(p?.p ?? 0, 3)}・最大差{" "}
        {formatNumber((p?.maxDiff ?? 0) * 100, 2)}%
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
        ▶ 再生で n が 2→1000 と増え、二項がポアソンへ収束します（稀な事象を多数回 → ポアソン）。
      </p>
    </div>
  );
}
