"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useNumericalComputationStore } from "@/lib/store/numerical-computation";
import { buildBisectFrames, STEP_F, STEP_ROOT } from "./frames";

/**
 * 「二分法で根 √2 を挟み撃ちする」ステッパー（描画層）。符号が反対の区間 [a,b] を
 * 毎回半分に狭め、区間幅が縮んで中点が √2 に収束する様子を 1 コマずつ見せる。
 * フレーム位置は共有ストアの frame。
 */

const W = 340;
const H = 220;
const PAD = 14;
const X0 = 0.9;
const X1 = 2.1;
const Y0 = -1.5;
const Y1 = 2.5;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(PAD + ((x - X0) / (X1 - X0)) * (W - 2 * PAD));
const sy = (y: number) => round2(H - PAD - ((y - Y0) / (Y1 - Y0)) * (H - 2 * PAD));

// f(x)=x²−2 の折れ線（61点）。
const CURVE = Array.from({ length: 61 }, (_, i) => {
  const x = X0 + ((X1 - X0) * i) / 60;
  return `${sx(x)},${sy(STEP_F(x))}`;
}).join(" ");

export function BisectionStepper() {
  const index = useNumericalComputationStore((s) => s.frame.index);
  const count = useNumericalComputationStore((s) => s.frame.count);
  const playing = useNumericalComputationStore((s) => s.frame.playing);
  const nextFrame = useNumericalComputationStore((s) => s.nextFrame);
  const prevFrame = useNumericalComputationStore((s) => s.prevFrame);
  const goToFrame = useNumericalComputationStore((s) => s.goToFrame);
  const setPlaying = useNumericalComputationStore((s) => s.setPlaying);
  const setFrameCount = useNumericalComputationStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBisectFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1500 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        二分法で √2 を挟み撃ち（f(x)=x²−2 の根、初期区間 [1, 2]）
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="二分法の区間縮小">
          {/* x 軸 */}
          <line x1={sx(X0)} y1={sy(0)} x2={sx(X1)} y2={sy(0)} className="stroke-slate-300" />
          {/* 真の根 √2 の位置 */}
          <line x1={sx(STEP_ROOT)} y1={PAD} x2={sx(STEP_ROOT)} y2={H - PAD} className="stroke-emerald-300" strokeDasharray="4 3" />
          <text x={sx(STEP_ROOT)} y={PAD + 8} textAnchor="middle" className="fill-emerald-500 text-[9px]">√2</text>
          {/* f(x)=x²−2 */}
          <polyline points={CURVE} fill="none" className="stroke-slate-800" strokeWidth={2} />
          {p ? (
            <>
              {/* 現在の区間 [a,b] を帯で強調 */}
              <rect x={sx(p.a)} y={PAD} width={round2(sx(p.b) - sx(p.a))} height={H - 2 * PAD} className="fill-blue-100" opacity={0.5} />
              {/* 区間端 a, b */}
              {[p.a, p.b].map((xv, i) => (
                <g key={i}>
                  <line x1={sx(xv)} y1={PAD} x2={sx(xv)} y2={H - PAD} className="stroke-blue-400" strokeWidth={1} />
                  <circle cx={sx(xv)} cy={sy(0)} r={3} className="fill-blue-500" />
                </g>
              ))}
              {/* 中点 mid と f(mid)（符号を見る点） */}
              <line x1={sx(p.mid)} y1={sy(0)} x2={sx(p.mid)} y2={sy(p.fmid)} className="stroke-amber-500" strokeDasharray="3 2" />
              <circle cx={sx(p.mid)} cy={sy(p.fmid)} r={4} className="fill-amber-500" />
              <circle cx={sx(p.mid)} cy={sy(0)} r={4} className="fill-amber-600" />
            </>
          ) : null}
        </svg>
      </div>

      {p ? (
        <p className="text-center font-mono text-sm text-slate-700">
          反復 {p.k} ／ [{p.a.toFixed(4)}, {p.b.toFixed(4)}] ／ 中点 {p.mid.toFixed(4)} ／ 幅 {p.width.toFixed(4)}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で 1 反復ずつ区間が半分になります。中点 <span className="font-mono">f(mid)</span> の符号を見て «根がある側»（符号が反対の側）を残すだけ。微分がいらず必ず収束する頑健な反復法ですが、1 反復で誤差が半分（線形収束）と遅めです。
      </p>
    </div>
  );
}
