"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useTSModelStore } from "@/lib/store/time-series-models";
import { buildModelFrames, GALLERY_MAXLAG, GALLERY_N } from "./frames";

const W = 340;
const SH = 90;
const AH = 100;
const PAD = { top: 8, right: 8, bottom: 8, left: 8 };

function seriesPath(vals: number[], toX: (i: number) => number, toY: (v: number) => number): string {
  return vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

/**
 * 時系列モデルの «型» を ①ホワイトノイズ→②AR(1)→③MA(1)→④ランダムウォーク とギャラリー形式で
 * コマ送りするステッパー（描画層）。上段=標本パス、下段=ACF の指紋。モデルごとの記憶の違いを対比する。
 * フレーム位置は共有ストアの frame。
 */
export function ModelGalleryStepper() {
  const index = useTSModelStore((s) => s.frame.index);
  const count = useTSModelStore((s) => s.frame.count);
  const playing = useTSModelStore((s) => s.frame.playing);
  const nextFrame = useTSModelStore((s) => s.nextFrame);
  const prevFrame = useTSModelStore((s) => s.prevFrame);
  const goToFrame = useTSModelStore((s) => s.goToFrame);
  const setPlaying = useTSModelStore((s) => s.setPlaying);
  const setFrameCount = useTSModelStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildModelFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1500 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const series = p?.series ?? [];
  const acfVals = p?.acf ?? [];

  const lo = Math.min(...series, 0);
  const hi = Math.max(...series, 0);
  const spW = W - PAD.left - PAD.right;
  const spH = SH - PAD.top - PAD.bottom;
  const sX = (i: number) => PAD.left + (i / (GALLERY_N - 1)) * spW;
  const sY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * spH;

  const acW = W - PAD.left - PAD.right;
  const acH = AH - PAD.top - PAD.bottom;
  const barW = acW / (GALLERY_MAXLAG + 1);
  const aX = (k: number) => PAD.left + k * barW + barW / 2;
  const aY = (r: number) => PAD.top + acH / 2 - (r * acH) / 2;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        時系列モデル図鑑：{p?.name}{" "}
        <span className={p?.stationary ? "text-emerald-600" : "text-red-500"}>
          （{p?.stationary ? "定常" : "非定常"}）
        </span>
      </p>

      <svg viewBox={`0 0 ${W} ${SH}`} className="h-auto w-full" role="img" aria-label="標本パス" data-testid="gallery-series">
        <line x1={PAD.left} y1={sY(0)} x2={W - PAD.right} y2={sY(0)} stroke="#e2e8f0" />
        <path d={seriesPath(series, sX, sY)} fill="none" stroke="#7c3aed" strokeWidth={1.2} />
      </svg>

      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-600">自己相関の指紋 ρ(k)</p>
        <svg viewBox={`0 0 ${W} ${AH}`} className="h-auto w-full" role="img" aria-label="ACFの指紋" data-testid="gallery-acf">
          <line x1={PAD.left} y1={aY(0)} x2={W - PAD.right} y2={aY(0)} stroke="#cbd5e1" />
          {acfVals.map((r, k) => (
            <g key={k}>
              <line x1={aX(k)} y1={aY(0)} x2={aX(k)} y2={aY(r)} stroke="#2563eb" strokeWidth={1.6} />
              <circle cx={aX(k)} cy={aY(r)} r={1.4} fill="#2563eb" />
            </g>
          ))}
        </svg>
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で4モデルを巡回。ACFの形（だらだら減衰＝AR / 早く切れる＝MA / 減衰しない＝ランダムウォーク）が «モデルの指紋» です。
      </p>
    </div>
  );
}
