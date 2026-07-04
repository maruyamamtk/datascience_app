"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useStochasticStore } from "@/lib/store/stochastic-processes";
import { buildProcessFrames } from "./frames";

const W = 340;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 20, left: 26 };
const PROC_COLOR = { walk: "#d97706", brownian: "#2563eb", poisson: "#16a34a" } as const;

/**
 * 代表的な確率過程 «ランダムウォーク→ブラウン運動→ポアソン過程» のギャラリーステッパー（描画層）。
 * 各過程の標本パス（折れ線 or 階段）と «増分の種類» を切り替えてコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * frame は useStochasticStore（ラボと共有の frame ストア）。
 */
export function ProcessGalleryStepper() {
  const index = useStochasticStore((s) => s.frame.index);
  const count = useStochasticStore((s) => s.frame.count);
  const playing = useStochasticStore((s) => s.frame.playing);
  const nextFrame = useStochasticStore((s) => s.nextFrame);
  const prevFrame = useStochasticStore((s) => s.prevFrame);
  const goToFrame = useStochasticStore((s) => s.goToFrame);
  const setPlaying = useStochasticStore((s) => s.setPlaying);
  const setFrameCount = useStochasticStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildProcessFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1700,
  });

  const frame = frameAt(frames, index);
  const path = frame?.payload?.path ?? [];
  const kind = frame?.payload?.kind ?? "brownian";
  const stepped = frame?.payload?.stepped ?? false;

  const vmin = Math.min(...path, 0);
  const vmax = Math.max(...path, 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (path.length - 1)) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v - vmin) / (vmax - vmin || 1)) * plotH;

  // 折れ線 or 階段（ポアソン）。
  const d = path
    .map((v, i) => {
      if (i === 0) return `M${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      if (stepped)
        return `L${toX(i).toFixed(1)},${toY(path[i - 1]).toFixed(1)} L${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      return `L${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">代表的な確率過程を見比べる</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="確率過程ギャラリー"
        data-testid="process-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#f1f5f9" />
        <path d={d} fill="none" stroke={PROC_COLOR[kind]} strokeWidth={2} />
      </svg>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm">
        <span className="font-semibold text-slate-800">{frame?.payload?.label}</span>
        <span className="ml-2 font-mono text-xs text-slate-600">
          増分: {frame?.payload?.increment}
        </span>
      </div>

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
        ▶ ランダムウォーク（±1）→ ブラウン運動（正規増分・連続）→
        ポアソン過程（指数間隔のジャンプ）。«増分の種類» が過程の性格を決めます。
      </p>
    </div>
  );
}
