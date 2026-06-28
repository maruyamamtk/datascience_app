"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { STRATA, useSurveyStore } from "@/lib/store/sampling-survey";
import { buildReductionFrames } from "./frames";

const W = 360;
const H = 90;

/**
 * 標本調査の «分散低減» ステッパー（描画層）。SRS → 層化（比例）→ 層化（ネイマン）と、
 * 標準誤差が下がる過程を棒でコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 標本サイズ n は上のラボと共有（useSurveyStore）。フレーム位置は frame。
 */
export function VarianceReductionStepper() {
  const n = useSurveyStore((s) => s.controls.n);
  const index = useSurveyStore((s) => s.frame.index);
  const count = useSurveyStore((s) => s.frame.count);
  const playing = useSurveyStore((s) => s.frame.playing);
  const nextFrame = useSurveyStore((s) => s.nextFrame);
  const prevFrame = useSurveyStore((s) => s.prevFrame);
  const goToFrame = useSurveyStore((s) => s.goToFrame);
  const setPlaying = useSurveyStore((s) => s.setPlaying);
  const setFrameCount = useSurveyStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildReductionFrames(STRATA, n), [n]);
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
  const maxSe = Math.max(...frames.map((f) => f.payload?.se ?? 0), 1e-6);
  const curMethod = frame?.payload?.method;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        同じ n={n} で抽出法を変えると標準誤差が下がる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="標準誤差の低減"
        data-testid="reduction-bars"
      >
        {frames.map((f, i) => {
          const se = f.payload?.se ?? 0;
          const w = (se / maxSe) * 240;
          const active = f.payload?.method === curMethod;
          const revealed = i <= index;
          return (
            <g key={i} opacity={revealed ? (active ? 1 : 0.4) : 0.12}>
              <text x={4} y={20 + i * 26} className="fill-slate-600 text-[9px]">
                {["SRS", "比例", "ネイマン"][i]}
              </text>
              <rect
                x={64}
                y={11 + i * 26}
                width={w}
                height={14}
                rx={3}
                fill={active ? "#7c3aed" : "#cbd5e1"}
              />
              <text x={64 + w + 4} y={22 + i * 26} className="fill-slate-700 font-mono text-[9px]">
                {revealed ? se.toFixed(3) : "—"}
              </text>
            </g>
          );
        })}
      </svg>

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
        ▶ SRS → 層化（比例）→ 層化（ネイマン）。同じ標本数でも «層に分けて配る»
        と精度が上がります。上のラボで n を変えると全法が連動。
      </p>
    </div>
  );
}
