"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { convolve, fairDie } from "@/lib/stats/transform";
import { useTransformStore } from "@/lib/store/variable-transformation";
import { buildConvolutionFrames } from "./frames";

const FACES = 6;
const GRID = 150; // 6×6 グリッドの一辺
const CHART_W = 360;

/**
 * 独立な和 Z=X+Y の分布を «畳み込み» で 1 マスずつ作るステッパー（描画層）。
 * 6×6 のサイコロ目グリッドで、和 s を作る反対角線（i+j=s）のマスを強調し、その確率を足し合わせて
 * 和の分布（三角形）を組み立てる（アルゴリズム図鑑スタイル）。フレーム位置は useTransformStore の frame。
 */
export function ConvolutionStepper() {
  const index = useTransformStore((s) => s.frame.index);
  const count = useTransformStore((s) => s.frame.count);
  const playing = useTransformStore((s) => s.frame.playing);
  const nextFrame = useTransformStore((s) => s.nextFrame);
  const prevFrame = useTransformStore((s) => s.prevFrame);
  const goToFrame = useTransformStore((s) => s.goToFrame);
  const setPlaying = useTransformStore((s) => s.setPlaying);
  const setFrameCount = useTransformStore((s) => s.setFrameCount);

  const conv = useMemo(() => convolve(fairDie(FACES), fairDie(FACES)), []);
  const frames = useMemo(() => buildConvolutionFrames(conv, FACES), [conv]);

  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 850,
  });

  const frame = frameAt(frames, index);
  const curSum = frame?.payload?.sum ?? 2;
  const curK = frame?.payload?.k ?? 0;

  const cell = GRID / FACES;
  const convMax = Math.max(...conv);
  const barW = CHART_W / conv.length;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        2 つのサイコロの和 Z=X+Y を畳み込みで作る（反対角線＝同じ和）
      </p>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {/* 6×6 の組合せグリッド */}
        <svg
          viewBox={`0 0 ${GRID + 24} ${GRID + 24}`}
          className="h-auto w-44"
          role="img"
          aria-label="サイコロの目グリッド"
          data-testid="dice-grid"
        >
          {Array.from({ length: FACES }, (_, ii) =>
            Array.from({ length: FACES }, (_, jj) => {
              const i = ii + 1;
              const j = jj + 1;
              const onDiag = i + j === curSum;
              return (
                <rect
                  key={`${i}-${j}`}
                  x={20 + jj * cell}
                  y={4 + ii * cell}
                  width={cell - 2}
                  height={cell - 2}
                  fill={onDiag ? "#2563eb" : "#eef2f7"}
                  stroke="#fff"
                />
              );
            }),
          )}
          {/* 軸ラベル */}
          {Array.from({ length: FACES }, (_, k) => (
            <text
              key={`c${k}`}
              x={20 + k * cell + cell / 2}
              y={GRID + 18}
              textAnchor="middle"
              className="fill-slate-400 text-[8px]"
            >
              {k + 1}
            </text>
          ))}
          {Array.from({ length: FACES }, (_, k) => (
            <text
              key={`r${k}`}
              x={12}
              y={4 + k * cell + cell / 2 + 3}
              textAnchor="middle"
              className="fill-slate-400 text-[8px]"
            >
              {k + 1}
            </text>
          ))}
        </svg>

        {/* 和の分布（三角形）。提示済みのみ描画、現在のバーを強調。 */}
        <svg
          viewBox={`0 0 ${CHART_W} 120`}
          className="h-auto w-full max-w-xs"
          role="img"
          aria-label="和の分布"
          data-testid="sum-dist"
        >
          {conv.map((pz, k) => {
            const h = (pz / convMax) * 92;
            const revealed = k <= curK;
            return (
              <g key={k}>
                <rect
                  id={`cell-${k}`}
                  x={k * barW + barW * 0.12}
                  y={100 - h}
                  width={barW * 0.76}
                  height={revealed ? h : 0}
                  fill={k === curK ? "#2563eb" : revealed ? "#bfdbfe" : "transparent"}
                />
                <text
                  x={k * barW + barW / 2}
                  y={114}
                  textAnchor="middle"
                  className="fill-slate-400 text-[8px]"
                >
                  {k + 2}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-center font-mono text-sm text-slate-700">
        P(Z={curSum}) = {formatNumber((frame?.payload?.prob ?? 0) * 100, 1)}%（
        {frame?.payload?.pairs.length ?? 0} 通り / 36）
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
        ▶ 再生で和の分布が左右から積み上がり «三角形»
        になります。一様分布どうしの和でも、和は中央が膨らむ（中心極限定理の芽）。
      </p>
    </div>
  );
}
