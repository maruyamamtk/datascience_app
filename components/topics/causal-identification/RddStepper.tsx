"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useDidStore } from "@/lib/store/causal-identification";
import { buildRddFrames, RDD_HALF_WIDTH } from "./frames";

/**
 * 回帰不連続デザイン（RDD）の «散布→左フィット→右フィット→ジャンプ» を1コマずつ見せるステッパー（描画層）。
 * 段階に応じて左右の局所線形フィットを重ね、閾値でのジャンプを縦線でハイライト（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */

const W = 360;
const H = 220;
const PAD = 30;

export function RddStepper() {
  const index = useDidStore((s) => s.frame.index);
  const count = useDidStore((s) => s.frame.count);
  const playing = useDidStore((s) => s.frame.playing);
  const nextFrame = useDidStore((s) => s.nextFrame);
  const prevFrame = useDidStore((s) => s.prevFrame);
  const goToFrame = useDidStore((s) => s.goToFrame);
  const setPlaying = useDidStore((s) => s.setPlaying);
  const setFrameCount = useDidStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildRddFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2200 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const points = p?.points ?? [];
  const cutoff = p?.cutoff ?? 50;

  // ドメイン。
  const xMin = cutoff - RDD_HALF_WIDTH;
  const xMax = cutoff + RDD_HALF_WIDTH;
  const ys = points.map((pt) => pt.y);
  const yMin = Math.min(...ys, 0) - 1;
  const yMax = Math.max(...ys, 1) + 1;
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);

  const xc = sx(cutoff);
  // 左右フィットの直線（閾値での値＝切片、傾きから両端を描く）。
  const leftLine = p?.left
    ? { x1: sx(xMin), y1: sy(p.left.intercept + p.left.slope * (xMin - cutoff)), x2: xc, y2: sy(p.left.atCutoff) }
    : null;
  const rightLine = p?.right
    ? { x1: xc, y1: sy(p.right.atCutoff), x2: sx(xMax), y2: sy(p.right.intercept + p.right.slope * (xMax - cutoff)) }
    : null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">回帰不連続デザインの手順</p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="RDD の散布と局所線形フィット">
          {/* 閾値 */}
          <line x1={xc} y1={PAD} x2={xc} y2={H - PAD} className="stroke-slate-300" strokeDasharray="3 3" />
          <text x={xc} y={H - 10} textAnchor="middle" className="fill-slate-500 text-[10px]">閾値</text>

          {/* 点 */}
          {points.map((pt, i) => (
            <circle key={i} cx={sx(pt.x)} cy={sy(pt.y)} r={2.6} className={pt.treated ? "fill-violet-500" : "fill-slate-400"} opacity={0.75} />
          ))}

          {/* 左フィット */}
          {leftLine ? <line {...leftLine} className="stroke-slate-600" strokeWidth={2.5} /> : null}
          {/* 右フィット */}
          {rightLine ? <line {...rightLine} className="stroke-violet-600" strokeWidth={2.5} /> : null}

          {/* ジャンプ */}
          {p?.stage === "jump" && p.left && p.right ? (
            <>
              <line x1={xc} y1={sy(p.left.atCutoff)} x2={xc} y2={sy(p.right.atCutoff)} className="stroke-emerald-600" strokeWidth={3} />
              <text x={xc + 6} y={(sy(p.left.atCutoff) + sy(p.right.atCutoff)) / 2} className="fill-emerald-700 text-[11px] font-semibold">ジャンプ {p.jump?.toFixed(2)}</text>
            </>
          ) : null}
        </svg>
      </div>
      <div className="flex justify-center gap-4 text-[11px]">
        <span className="text-slate-500">● 処置なし（閾値未満）</span>
        <span className="text-violet-600">● 処置あり（閾値以上）</span>
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «散布→左を線形フィット→右を線形フィット→閾値のジャンプ» と進みます。④の緑の縦線＝閾値ぎりぎりの人の処置効果です。
      </p>
    </div>
  );
}
