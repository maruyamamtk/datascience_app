"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useAnovaStore } from "@/lib/store/analysis-of-variance";
import { buildDecompFrames } from "./frames";

const W = 360;
const H = 110;
const PAD = { top: 16, right: 14, bottom: 20, left: 14 };

/**
 * 分散分析の «全変動 = 級間 + 級内» 分解ステッパー（描画層）。全変動 → 級内 → 級間 → F比 と
 * 棒で量を積み上げ、分解の意味をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * フレーム位置は useAnovaStore の frame。
 */
export function VarianceDecompStepper() {
  const anova = useAnovaStore((s) => s.derived.anova);
  const index = useAnovaStore((s) => s.frame.index);
  const count = useAnovaStore((s) => s.frame.count);
  const playing = useAnovaStore((s) => s.frame.playing);
  const nextFrame = useAnovaStore((s) => s.nextFrame);
  const prevFrame = useAnovaStore((s) => s.prevFrame);
  const goToFrame = useAnovaStore((s) => s.goToFrame);
  const setPlaying = useAnovaStore((s) => s.setPlaying);
  const setFrameCount = useAnovaStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildDecompFrames(anova), [anova]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1500,
  });

  const frame = frameAt(frames, index);
  const stage = frame?.payload?.stage;

  // 級間/級内/全変動の棒（共通スケール）。
  const maxSS = Math.max(anova.ssTotal, 1);
  const plotW = W - PAD.left - PAD.right;
  const barH = 18;
  const bar = (label: string, value: number, color: string, active: boolean, yTop: number) => {
    const w = (value / maxSS) * plotW;
    return (
      <g opacity={active ? 1 : 0.3}>
        <rect x={PAD.left} y={yTop} width={w} height={barH} rx={3} fill={color} />
        <text
          x={PAD.left + 4}
          y={yTop + barH / 2 + 3}
          className="fill-white text-[9px] font-semibold"
        >
          {label} {value.toFixed(1)}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">全変動 = 級間変動 + 級内変動 の分解</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="変動分解"
        data-testid="decomp-bars"
      >
        {bar("全変動", anova.ssTotal, "#94a3b8", stage === "total", PAD.top)}
        {bar(
          "級内(誤差)",
          anova.ssWithin,
          "#0ea5e9",
          stage === "within" || stage === "ratio",
          PAD.top + 28,
        )}
        {bar(
          "級間(差)",
          anova.ssBetween,
          "#7c3aed",
          stage === "between" || stage === "ratio",
          PAD.top + 56,
        )}
      </svg>

      {stage === "ratio" && (
        <p className="text-center font-mono text-sm text-violet-700">
          F = MS級間/MS級内 = {anova.F.toFixed(2)}（p={anova.p.toFixed(3)}）
        </p>
      )}

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
        ▶ 全変動 → 級内（群内の誤差）→ 級間（群の差）→
        F比。上のラボで隔たりを変えると各変動も変わります。
      </p>
    </div>
  );
}
