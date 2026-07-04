"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useForecastStore } from "@/lib/store/time-series-forecasting";
import { buildForecastFrames } from "./frames";

const W = 340;
const H = 140;
const PAD = { top: 10, right: 8, bottom: 8, left: 8 };
const METHOD_COLOR = "#f97316";

function path(vals: { x: number; y: number }[]): string {
  return vals.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/**
 * 予測手法の «訓練→検証で当て比べ» をコマ送りで見せるステッパー（描画層）。
 * 訓練/検証の境界線、各手法の検証区間予測（橙）、RMSE の積み上げ比較バーを描く。
 * フレーム位置は共有ストアの frame。
 */
export function ForecastEvalStepper() {
  const index = useForecastStore((s) => s.frame.index);
  const count = useForecastStore((s) => s.frame.count);
  const playing = useForecastStore((s) => s.frame.playing);
  const nextFrame = useForecastStore((s) => s.nextFrame);
  const prevFrame = useForecastStore((s) => s.prevFrame);
  const goToFrame = useForecastStore((s) => s.goToFrame);
  const setPlaying = useForecastStore((s) => s.setPlaying);
  const setFrameCount = useForecastStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildForecastFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1600 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const series = p?.series ?? [];
  const cut = p?.cut ?? 0;
  const pred = p?.pred ?? null;
  const scores = p?.scores ?? [];

  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const n = series.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const seriesPts = series.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const predPts = pred ? pred.map((v, i) => ({ x: toX(cut + i), y: toY(v) })) : [];
  const maxScore = Math.max(1, ...scores.map((s) => s.rmse));
  const best = scores.length > 0 ? scores.reduce((a, b) => (b.rmse < a.rmse ? b : a)) : null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">予測手法の当て比べ（訓練→検証RMSE）</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="予測の当て比べ" data-testid="fc-eval-plot">
        {/* 検証区間の網掛け */}
        <rect x={toX(cut)} y={PAD.top} width={W - PAD.right - toX(cut)} height={plotH} fill="#fef3c7" opacity={0.5} />
        <line x1={toX(cut)} y1={PAD.top} x2={toX(cut)} y2={toY(lo)} stroke="#d97706" strokeWidth={1} strokeDasharray="3 2" />
        {/* 観測系列 */}
        <path d={path(seriesPts)} fill="none" stroke="#64748b" strokeWidth={1.2} />
        {/* 予測 */}
        {predPts.length > 0 ? <path d={path(predPts)} fill="none" stroke={METHOD_COLOR} strokeWidth={2} strokeDasharray="4 2" /> : null}
        <text x={toX(cut / 2)} y={H - 3} textAnchor="middle" className="fill-slate-400 text-[8px]">訓練</text>
        <text x={toX(cut + (n - cut) / 2)} y={H - 3} textAnchor="middle" className="fill-amber-600 text-[8px]">検証</text>
      </svg>

      {/* RMSE 比較バー */}
      {scores.length > 0 ? (
        <div className="space-y-1" data-testid="fc-scores">
          {scores.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-[10px]">
              <span className="w-28 shrink-0 text-right text-slate-600">{s.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                <div className="h-full rounded" style={{ width: `${(s.rmse / maxScore) * 100}%`, background: best && s.key === best.key ? "#16a34a" : "#fb923c" }} />
              </div>
              <span className={`w-10 text-right font-mono ${best && s.key === best.key ? "font-bold text-green-700" : "text-slate-600"}`}>{s.rmse.toFixed(2)}</span>
            </div>
          ))}
          {best ? <p className="text-center text-[10px] text-green-700">最小RMSE＝{best.label}（この検証で最も当たった）</p> : null}
        </div>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «分割→素朴→平均→ドリフト→指数平滑化» を検証区間にぶつけ、RMSE を積み上げ比較します。トレンド系列ではドリフトが有利です。
      </p>
    </div>
  );
}
