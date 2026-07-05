"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useOptimizationStore } from "@/lib/store/optimization";
import { buildDescentFrames, STEP_F, STEP_LR } from "./frames";

/**
 * 「勾配降下で坂を転がり落ちる」ステッパー（描画層）。固定の学習率で1歩ずつ
 * x_{k+1}=x_k−η·f'(x_k) を進め、点が谷底（最小点）へ近づく様子を1コマずつ見せる。
 * フレーム位置は共有ストアの frame。
 */

const W = 320;
const H = 220;
const PAD = 12;
const X0 = -2.8;
const X1 = 2.8;
const Y0 = 0;
const Y1 = STEP_F(X1) * 1.05;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(PAD + ((x - X0) / (X1 - X0)) * (W - 2 * PAD));
const sy = (y: number) => round2(H - PAD - ((y - Y0) / (Y1 - Y0)) * (H - 2 * PAD));

// 目的関数 f(x)=½x² の折れ線（65点）。
const CURVE = Array.from({ length: 65 }, (_, i) => {
  const x = X0 + ((X1 - X0) * i) / 64;
  return `${sx(x)},${sy(STEP_F(x))}`;
}).join(" ");

export function DescentStepper() {
  const index = useOptimizationStore((s) => s.frame.index);
  const count = useOptimizationStore((s) => s.frame.count);
  const playing = useOptimizationStore((s) => s.frame.playing);
  const nextFrame = useOptimizationStore((s) => s.nextFrame);
  const prevFrame = useOptimizationStore((s) => s.prevFrame);
  const goToFrame = useOptimizationStore((s) => s.goToFrame);
  const setPlaying = useOptimizationStore((s) => s.setPlaying);
  const setFrameCount = useOptimizationStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildDescentFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        勾配降下で坂を転がり落ちる（f(x)=½x²、学習率 η={STEP_LR}）
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="勾配降下のステップ">
          {/* x 軸・最小点 */}
          <line x1={sx(X0)} y1={sy(0)} x2={sx(X1)} y2={sy(0)} className="stroke-slate-300" />
          <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} className="stroke-slate-200" strokeDasharray="4 3" />
          {/* 目的関数 f(x)=½x² */}
          <polyline points={CURVE} fill="none" className="stroke-slate-800" strokeWidth={2} />
          {p ? (
            <>
              {/* 次の到達点へのステップ矢印（x 軸上） */}
              <line x1={sx(p.x)} y1={sy(0)} x2={sx(p.xNext)} y2={sy(0)} className="stroke-blue-500" strokeWidth={2} />
              {/* 現在位置から曲線への垂線 */}
              <line x1={sx(p.x)} y1={sy(0)} x2={sx(p.x)} y2={sy(p.fx)} className="stroke-slate-300" strokeDasharray="3 2" />
              {/* 次の到達点（薄い点） */}
              <circle cx={sx(p.xNext)} cy={sy(STEP_F(p.xNext))} r={4} className="fill-blue-300" />
              {/* 現在位置（ボール） */}
              <circle cx={sx(p.x)} cy={sy(p.fx)} r={6} className="fill-blue-600" />
            </>
          ) : null}
        </svg>
      </div>

      {p ? (
        <p className="text-center font-mono text-sm text-slate-700">
          ステップ {p.k} ／ x={p.x.toFixed(3)} ／ 勾配 f′(x)={p.grad.toFixed(3)} ／ 次 x={p.xNext.toFixed(3)}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で1歩ずつ «勾配の逆向きに η の歩幅» で下ります。谷に近いほど勾配（傾き）が緩み、歩幅が自動で縮んで谷底 x=0 に収まります。これが勾配降下の収束です。
      </p>
    </div>
  );
}
