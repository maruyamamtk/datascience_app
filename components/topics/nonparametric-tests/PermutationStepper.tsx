"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { histogram } from "@/lib/stats/histogram";
import { useNonparamStore } from "@/lib/store/nonparametric-tests";
import { buildPermutationFrames } from "./frames";

const STEPS = [10, 50, 200, 600, 1200];
const W = 360;
const H = 130;
const PAD = { top: 12, right: 12, bottom: 22, left: 12 };
const AXIS = 4;
const BINS = 33;

/**
 * 並べ替え検定の «帰無分布» を段階的に積み上げるステッパー（描画層）。提示回数を 10→1200 と増やし、
 * ラベルを割り直した平均差のヒストグラムが滑らかになり、観測差の «端っぽさ»（p）が安定する様子を
 * コマ送りで見せる（アルゴリズム図鑑スタイル）。フレーム位置は useNonparamStore の frame。
 */
export function PermutationStepper() {
  const nullDist = useNonparamStore((s) => s.derived.nullDist);
  const observedDiff = useNonparamStore((s) => s.derived.observedDiff);
  const index = useNonparamStore((s) => s.frame.index);
  const count = useNonparamStore((s) => s.frame.count);
  const playing = useNonparamStore((s) => s.frame.playing);
  const nextFrame = useNonparamStore((s) => s.nextFrame);
  const prevFrame = useNonparamStore((s) => s.prevFrame);
  const goToFrame = useNonparamStore((s) => s.goToFrame);
  const setPlaying = useNonparamStore((s) => s.setPlaying);
  const setFrameCount = useNonparamStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildPermutationFrames(nullDist, observedDiff, STEPS),
    [nullDist, observedDiff],
  );
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
  const collected = frame?.payload?.collected;

  const hist = useMemo(
    () => histogram(collected ?? [], { min: -AXIS, max: AXIS, bins: BINS }),
    [collected],
  );
  const maxCount = Math.max(...hist.map((b) => b.count), 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v + AXIS) / (2 * AXIS)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;
  const barW = plotW / BINS;
  const obsX = toX(Math.max(-AXIS, Math.min(AXIS, observedDiff)));

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">並べ替え回数を増やして帰無分布を作る</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="帰無分布の構築"
        data-testid="perm-step"
      >
        {hist.map((b, i) => {
          const inTail = Math.abs((b.x0 + b.x1) / 2) >= Math.abs(observedDiff) - 1e-9;
          return (
            <rect
              key={i}
              x={toX(b.x0)}
              y={toY(b.count)}
              width={barW}
              height={toY(0) - toY(b.count)}
              fill={inTail ? "#16a34a" : "#94a3b8"}
              opacity={0.5}
            />
          );
        })}
        <line x1={obsX} y1={PAD.top} x2={obsX} y2={toY(0)} stroke="#16a34a" strokeWidth={2} />
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        並べ替え {frame?.payload?.count ?? 0} 回・p推定{" "}
        {formatNumber(frame?.payload?.pEstimate ?? 0, 3)}
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
        ▶ 再生で並べ替え回数が増え、帰無分布が滑らかに。緑の裾（観測以上に極端）の割合が p
        値に収束します。
      </p>
    </div>
  );
}
