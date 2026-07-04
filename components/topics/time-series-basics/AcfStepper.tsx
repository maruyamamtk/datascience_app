"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useTimeSeriesStore } from "@/lib/store/time-series-basics";
import { buildAcfFrames, MAX_LAG, STEP_N, stepSeries } from "./frames";

const W = 340;
const SH = 90; // 系列プロット高
const AH = 110; // コレログラム高
const PAD = { top: 10, right: 8, bottom: 18, left: 8 };

function seriesPath(vals: number[], toX: (i: number) => number, toY: (v: number) => number): string {
  return vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

/**
 * 自己相関（ACF）を «系列をラグ k ずらして重ね、相関を測る→コレログラムに積む» コマ送りで見せる
 * ステッパー（描画層）。上段は元系列とラグずらしの重ね合わせ、下段は積み上がるコレログラム。
 * フレーム位置は共有ストアの frame。
 */
export function AcfStepper() {
  const index = useTimeSeriesStore((s) => s.frame.index);
  const count = useTimeSeriesStore((s) => s.frame.count);
  const playing = useTimeSeriesStore((s) => s.frame.playing);
  const nextFrame = useTimeSeriesStore((s) => s.nextFrame);
  const prevFrame = useTimeSeriesStore((s) => s.prevFrame);
  const goToFrame = useTimeSeriesStore((s) => s.goToFrame);
  const setPlaying = useTimeSeriesStore((s) => s.setPlaying);
  const setFrameCount = useTimeSeriesStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildAcfFrames(), []);
  const series = useMemo(() => stepSeries(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 800 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const lag = p?.lag ?? 0;
  const acfSoFar = p?.acfSoFar ?? [];
  const bound = p?.bound ?? 0;

  // 上段：系列プロット。
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const spW = W - PAD.left - PAD.right;
  const spH = SH - PAD.top - PAD.bottom;
  const sX = (i: number) => PAD.left + (i / (STEP_N - 1)) * spW;
  const sY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * spH;

  // 下段：コレログラム。
  const acW = W - PAD.left - PAD.right;
  const acH = AH - PAD.top - PAD.bottom;
  const barW = acW / (MAX_LAG + 1);
  const aX = (k: number) => PAD.left + k * barW + barW / 2;
  const aY = (r: number) => PAD.top + acH / 2 - (r * acH) / 2;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">自己相関（ACF）＝ラグ k ずらして重ねた相関</p>

      {/* 上段：元系列 + ラグずらし */}
      <svg viewBox={`0 0 ${W} ${SH}`} className="h-auto w-full" role="img" aria-label="系列とラグずらし" data-testid="acf-series">
        <path d={seriesPath(series, sX, sY)} fill="none" stroke="#64748b" strokeWidth={1.2} />
        {lag > 0 ? (
          <path
            d={seriesPath(series.slice(0, STEP_N - lag), (i) => sX(i + lag), sY)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.2}
            opacity={0.7}
            strokeDasharray="3 2"
          />
        ) : null}
      </svg>
      <p className="text-center text-[10px] text-slate-500">
        <span className="text-slate-500">━ 元系列</span>{" "}
        {lag > 0 ? <span className="text-blue-600">┄ {lag}期ずらした系列（重なりの相関が ρ({lag})）</span> : "（ラグ0＝ずらさず自分自身）"}
      </p>

      {/* 下段：コレログラム */}
      <svg viewBox={`0 0 ${W} ${AH}`} className="h-auto w-full" role="img" aria-label="コレログラム" data-testid="acf-plot">
        {/* 信頼限界帯 */}
        <rect x={PAD.left} y={aY(bound)} width={acW} height={aY(-bound) - aY(bound)} fill="#93c5fd" opacity={0.18} />
        <line x1={PAD.left} y1={aY(0)} x2={W - PAD.right} y2={aY(0)} stroke="#cbd5e1" />
        {acfSoFar.map((r, k) => {
          const sig = k > 0 && Math.abs(r) > bound;
          return (
            <g key={k}>
              <line x1={aX(k)} y1={aY(0)} x2={aX(k)} y2={aY(r)} stroke={k === lag ? "#dc2626" : sig ? "#2563eb" : "#94a3b8"} strokeWidth={k === lag ? 2.5 : 1.5} />
              <circle cx={aX(k)} cy={aY(r)} r={k === lag ? 2.6 : 1.6} fill={k === lag ? "#dc2626" : sig ? "#2563eb" : "#94a3b8"} />
            </g>
          );
        })}
        <text x={aX(0)} y={AH - 5} textAnchor="middle" className="fill-slate-400 text-[8px]">0</text>
        <text x={aX(MAX_LAG)} y={AH - 5} textAnchor="middle" className="fill-slate-400 text-[8px]">{MAX_LAG}</text>
      </svg>

      <p className="text-center font-mono text-xs text-slate-700">
        ラグ={lag}・ρ({lag})={(p?.rho ?? 0).toFixed(3)}・信頼限界±{bound.toFixed(3)}
        {p?.significant ? " ← 有意" : ""}
      </p>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生でラグ k を 0→{MAX_LAG} と増やし、各 ρ(k) をコレログラムに積みます。周期12・24でピーク（青帯の外＝有意）が立つのが季節性のサインです。
      </p>
    </div>
  );
}
