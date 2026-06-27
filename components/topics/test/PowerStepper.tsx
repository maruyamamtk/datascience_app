"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useTestStore } from "@/lib/store/test";
import { buildPowerFrames } from "./frames";

// 検出力曲線を描く標本サイズの刻み（小→大）。コマ送りで 1 点ずつ開示する。
const N_VALUES = [5, 10, 15, 20, 30, 40, 50, 70, 100];

const W = 380;
const H = 200;
const PAD = { top: 14, right: 16, bottom: 30, left: 38 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const N_MIN = N_VALUES[0];
const N_MAX = N_VALUES[N_VALUES.length - 1];

const COLOR_CURVE = "#16a34a"; // 検出力曲線
const TARGET = 0.8; // 慣習的な目標検出力

/**
 * 検出力コマ送り（描画層）。効果量・α・対立仮説（ラボの操作値）を固定したまま、標本サイズ n を
 * 1 段ずつ増やすと検出力 1−β がどう上がるかを、検出力曲線の点を 1 つずつ開示するコマ送りで見せる
 * （StepPlayer・色ハイライト・近傍コールアウト）。フレーム位置は useTestStore の frame が
 * single source of truth（HypothesisLab と同じストアを共有）。
 */
export function PowerStepper() {
  const effectSize = useTestStore((s) => s.controls.effectSize);
  const alpha = useTestStore((s) => s.controls.alpha);
  const alternative = useTestStore((s) => s.controls.alternative);
  const index = useTestStore((s) => s.frame.index);
  const count = useTestStore((s) => s.frame.count);
  const playing = useTestStore((s) => s.frame.playing);
  const nextFrame = useTestStore((s) => s.nextFrame);
  const prevFrame = useTestStore((s) => s.prevFrame);
  const goToFrame = useTestStore((s) => s.goToFrame);
  const setPlaying = useTestStore((s) => s.setPlaying);
  const setFrameCount = useTestStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildPowerFrames(N_VALUES, { effectSize, alpha, alternative }),
    [effectSize, alpha, alternative],
  );

  // 効果量・α・対立仮説が変わったら曲線を作り直す（フレーム総数を設定）。
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 600,
  });

  const frame = frameAt(frames, index);
  const revealed = frame?.payload?.revealed ?? [];

  const toX = (nv: number) => PAD.left + ((nv - N_MIN) / (N_MAX - N_MIN || 1)) * CHART_W;
  const toY = (p: number) => PAD.top + (1 - p) * CHART_H;

  const linePath = revealed
    .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.n).toFixed(2)} ${toY(pt.power).toFixed(2)}`)
    .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        効果量 d={formatNumber(effectSize)}・α={alpha} を固定し、n を増やしたときの検出力 1−β
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="標本サイズ n に対する検出力曲線"
        data-testid="power-curve"
      >
        {/* y 軸グリッド（0, 0.5, 0.8, 1.0） */}
        {[0, 0.5, 0.8, 1].map((p) => (
          <g key={p}>
            <line
              x1={PAD.left}
              y1={toY(p)}
              x2={W - PAD.right}
              y2={toY(p)}
              stroke={p === TARGET ? "#16a34a" : "#e2e8f0"}
              strokeWidth={1}
              strokeDasharray={p === TARGET ? "4 3" : undefined}
            />
            <text x={PAD.left - 6} y={toY(p) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
              {p === TARGET ? "0.8" : formatNumber(p, 1)}
            </text>
          </g>
        ))}

        {/* x 軸 */}
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" strokeWidth={1} />
        <text x={PAD.left} y={H - 8} textAnchor="start" className="fill-slate-400 text-[9px]">
          n={N_MIN}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-slate-400 text-[9px]">
          n={N_MAX}
        </text>

        {/* 検出力曲線（開示済み）と点 */}
        {revealed.length > 1 ? (
          <path d={linePath} fill="none" stroke={COLOR_CURVE} strokeWidth={2} />
        ) : null}
        {revealed.map((pt, i) => {
          const latest = i === revealed.length - 1;
          return (
            <circle
              key={i}
              cx={toX(pt.n)}
              cy={toY(pt.power)}
              r={latest ? 5 : 3}
              fill={latest ? COLOR_CURVE : "#fff"}
              stroke={COLOR_CURVE}
              strokeWidth={2}
            />
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
        ヒント: ▶ 再生で n を増やすと検出力（緑）が右上へ伸びます。破線（0.8）は慣習的な目標検出力。
        上のラボで効果量や α・片側/両側を変えると、この曲線の形も変わります。
      </p>
    </div>
  );
}
