"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { STATES, useMarkovStore } from "@/lib/store/markov-chains";
import { buildDistributionFrames } from "./frames";

const STATE_COLORS = ["#f59e0b", "#94a3b8", "#2563eb"];
const W = 300;
const H = 130;
const PAD = { top: 12, right: 12, bottom: 26, left: 24 };

/**
 * マルコフ連鎖の状態分布が «初期分布→定常分布» へ収束する過程のステッパー（描画層）。
 * 各ステップの分布を棒グラフで見せ、初期の偏りが π P の反復で薄れ定常分布に落ち着く様子をコマ送りで示す
 * （アルゴリズム図鑑スタイル）。遷移行列は上のラボと共有（useMarkovStore）。フレーム位置は frame。
 */
export function DistributionStepper() {
  const evolution = useMarkovStore((s) => s.derived.evolution);
  const tvSeq = useMarkovStore((s) => s.derived.tvSeq);
  const stationary = useMarkovStore((s) => s.derived.stationary);
  const index = useMarkovStore((s) => s.frame.index);
  const count = useMarkovStore((s) => s.frame.count);
  const playing = useMarkovStore((s) => s.frame.playing);
  const nextFrame = useMarkovStore((s) => s.nextFrame);
  const prevFrame = useMarkovStore((s) => s.prevFrame);
  const goToFrame = useMarkovStore((s) => s.goToFrame);
  const setPlaying = useMarkovStore((s) => s.setPlaying);
  const setFrameCount = useMarkovStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildDistributionFrames(evolution, tvSeq, STATES),
    [evolution, tvSeq],
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
    intervalMs: 900,
  });

  const frame = frameAt(frames, index);
  const dist = frame?.payload?.dist ?? [];

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const bandW = plotW / STATES.length;
  const toY = (p: number) => PAD.top + (1 - p) * plotH;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">状態分布の推移 π_t → 定常分布 π</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="分布の推移"
        data-testid="dist-plot"
      >
        {[0, 0.5, 1].map((g) => (
          <line key={g} x1={PAD.left} y1={toY(g)} x2={W - PAD.right} y2={toY(g)} stroke="#f1f5f9" />
        ))}
        {STATES.map((s, i) => {
          const cx = PAD.left + i * bandW + bandW / 2;
          const p = dist[i] ?? 0;
          return (
            <g key={s}>
              {/* 定常分布の目標線 */}
              <line
                x1={cx - bandW * 0.34}
                y1={toY(stationary[i])}
                x2={cx + bandW * 0.34}
                y2={toY(stationary[i])}
                stroke={STATE_COLORS[i]}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.7}
              />
              {/* 現在の分布バー */}
              <rect
                x={cx - bandW * 0.28}
                y={toY(p)}
                width={bandW * 0.56}
                height={toY(0) - toY(p)}
                fill={STATE_COLORS[i]}
                opacity={0.75}
                rx={2}
              />
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                className="text-[9px] font-semibold"
                fill={STATE_COLORS[i]}
              >
                {s}
              </text>
              <text x={cx} y={toY(p) - 2} textAnchor="middle" className="fill-slate-500 text-[8px]">
                {(p * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        t={frame?.payload?.step}・定常への距離={(frame?.payload?.tv ?? 0).toFixed(3)}
        {frame?.payload?.converged ? " ← 収束" : ""}
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
        ▶ 破線が定常分布。再生で π_{"{t+1}"}=π_t P
        を繰り返すと、初期の偏りが消え破線（定常分布）に収束します。上のラボで遷移を変えると収束先も変化。
      </p>
    </div>
  );
}
