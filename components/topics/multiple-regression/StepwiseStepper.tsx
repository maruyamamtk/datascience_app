"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { mulberry32 } from "@/lib/stats/random";
import { useMultiRegStore } from "@/lib/store/multiple-regression";
import { buildStepwiseFrames } from "./frames";

// x1 が効く・x2 が少し効く・x3 はノイズ（効かない）。前進選択でこの順に投入。
function makeData() {
  const rng = mulberry32(20240802);
  const n = 60;
  const x1 = Array.from({ length: n }, () => rng() * 4);
  const x2 = Array.from({ length: n }, () => rng() * 4);
  const x3 = Array.from({ length: n }, () => rng() * 4); // y と無関係
  const y = x1.map((v, i) => 2 * v + 1.2 * x2[i] + (rng() - 0.5) * 2);
  return { columns: [x1, x2, x3], labels: ["x1", "x2", "x3(ノイズ)"], y };
}

const W = 320;
const H = 120;
const PAD = { top: 14, right: 14, bottom: 28, left: 30 };

/**
 * 前進選択ステッパー（描画層）。説明変数を1つずつ投入し、R²（青）と自由度調整済み R²（赤）の
 * 推移を見せる。R² は必ず上がるが、効かない変数では調整済み R² が下がる（過剰適合）。
 * フレーム位置は useMultiRegStore の frame。
 */
export function StepwiseStepper() {
  const index = useMultiRegStore((s) => s.frame.index);
  const count = useMultiRegStore((s) => s.frame.count);
  const playing = useMultiRegStore((s) => s.frame.playing);
  const nextFrame = useMultiRegStore((s) => s.nextFrame);
  const prevFrame = useMultiRegStore((s) => s.prevFrame);
  const goToFrame = useMultiRegStore((s) => s.goToFrame);
  const setPlaying = useMultiRegStore((s) => s.setPlaying);
  const setFrameCount = useMultiRegStore((s) => s.setFrameCount);

  const { columns, labels, y } = useMemo(makeData, []);
  const frames = useMemo(() => buildStepwiseFrames(columns, labels, y), [columns, labels, y]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1300,
  });

  const frame = frameAt(frames, index);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toY = (v: number) => PAD.top + (1 - v) * plotH;
  const bandW = plotW / frames.length;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        前進選択：説明変数を1つずつ投入（R²=青 / 調整済みR²=赤）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="R²と調整済みR²"
        data-testid="stepwise-plot"
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#eef2f7" />
            <text
              x={PAD.left - 4}
              y={toY(v) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[8px]"
            >
              {v}
            </text>
          </g>
        ))}
        {frames.map((f, k) => {
          if (k > index) return null;
          const r2 = f.payload?.rSquared ?? 0;
          const adj = f.payload?.adjustedRSquared ?? 0;
          const cx = PAD.left + k * bandW + bandW / 2;
          return (
            <g key={k}>
              <rect
                x={cx - 10}
                y={toY(r2)}
                width={9}
                height={toY(0) - toY(r2)}
                fill="#2563eb"
                opacity={0.6}
              />
              <rect
                x={cx + 1}
                y={toY(adj)}
                width={9}
                height={toY(0) - toY(adj)}
                fill="#dc2626"
                opacity={0.6}
              />
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[8px]">
                +{f.payload?.vars[f.payload.vars.length - 1]}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        {frame?.payload?.vars.join(" + ")}・R²={formatNumber(frame?.payload?.rSquared ?? 0, 3)}
        ・調整済みR²={formatNumber(frame?.payload?.adjustedRSquared ?? 0, 3)}
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
        ▶ 変数を足すと R²（青）は必ず上がりますが、効かない «ノイズ変数»
        を入れると調整済みR²（赤）が下がります＝過剰適合の兆候。
      </p>
    </div>
  );
}
