"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useLlnStore } from "@/lib/store/law-of-large-numbers";
import { buildNormalApproxFrames } from "./frames";

const P = 0.4;
const NS = [5, 10, 20, 50, 150];
const W = 360;
const H = 140;
const PAD = { top: 12, right: 12, bottom: 22, left: 14 };

/**
 * 二項分布 → 正規分布の近似ステッパー（描画層）。n を増やすと二項 PMF（棒）が正規曲線に重なる
 * （de Moivre–Laplace、中心極限定理の離散版）。x 軸は標準化 (k−μ)/σ で固定し、形の収束だけを見せる。
 * フレーム位置は useLlnStore の frame。
 */
export function NormalApproxStepper() {
  const index = useLlnStore((s) => s.frame.index);
  const count = useLlnStore((s) => s.frame.count);
  const playing = useLlnStore((s) => s.frame.playing);
  const nextFrame = useLlnStore((s) => s.nextFrame);
  const prevFrame = useLlnStore((s) => s.prevFrame);
  const goToFrame = useLlnStore((s) => s.goToFrame);
  const setPlaying = useLlnStore((s) => s.setPlaying);
  const setFrameCount = useLlnStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildNormalApproxFrames(P, NS), []);

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
  const pmf = p?.pmf ?? [];
  const mu = p?.mu ?? 0;
  const sigma = p?.sigma ?? 1;

  // 標準化軸 z=(k−μ)/σ を [-4,4] に固定（全フレーム共通で軸が動かない）。
  const Z = 4;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const zToX = (z: number) => PAD.left + ((z + Z) / (2 * Z)) * plotW;
  // y は標準化後の密度 σ·f を基準（最大 ~0.4）に固定。
  const yMax = 0.42;
  const toY = (d: number) => PAD.top + (1 - Math.min(1, d / yMax)) * plotH;

  // 二項の棒（標準化後の «密度» σ·P(X=k) に変換して正規と同尺度に）。
  const bars = pmf.map((pk, k) => ({ z: (k - mu) / sigma, h: pk * sigma }));
  // 正規曲線（標準正規）。
  const normalPath = Array.from({ length: 81 }, (_, i) => {
    const z = -Z + (i / 80) * (2 * Z);
    const d = Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
    return `${i === 0 ? "M" : "L"}${zToX(z).toFixed(1)},${toY(d).toFixed(1)}`;
  }).join(" ");

  const barW = Math.max(2, plotW / (2 * Z) / sigma);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        n を増やす → 二項（青棒, p={P}）が正規（赤線）に重なる（標準化軸）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="二項から正規への近似"
        data-testid="normal-approx"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        {bars.map((b, k) =>
          Math.abs(b.z) <= Z ? (
            <rect
              key={k}
              x={zToX(b.z) - barW / 2}
              y={toY(b.h)}
              width={barW}
              height={Math.max(0, toY(0) - toY(b.h))}
              fill="#2563eb"
              opacity={0.6}
            />
          ) : null,
        )}
        <path d={normalPath} fill="none" stroke="#dc2626" strokeWidth={2} />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        n = {p?.n}・μ=np={formatNumber(mu)}・σ={formatNumber(sigma)}・CDF最大誤差{" "}
        {formatNumber((p?.maxError ?? 0) * 100, 2)}%
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
        ▶ 再生で n が増え、とがった二項が滑らかな正規へ。離散を連続で近似するときは
        «連続修正»（境界に±0.5）で精度が上がります。
      </p>
    </div>
  );
}
