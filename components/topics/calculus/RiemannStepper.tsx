"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useCalculusStore } from "@/lib/store/calculus";
import { A, AREA_F, B, buildRiemannFrames, EXACT_AREA } from "./frames";

/**
 * 「リーマン和で面積を詰める」ステッパー（描画層）。短冊（矩形）の本数 n を 1→32 と
 * 倍にしながら曲線の下を埋め、総和が定積分（真の面積）へ収束する様子を1コマずつ見せる。
 * フレーム位置は共有ストアの frame。
 */

const W = 320;
const H = 220;
const PAD = 10;
const X0 = A - 0.1;
const X1 = B + 0.1;
const Y0 = 0;
const Y1 = AREA_F(B) * 1.15; // 上端に余白。
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(PAD + ((x - X0) / (X1 - X0)) * (W - 2 * PAD));
const sy = (y: number) => round2(H - PAD - ((y - Y0) / (Y1 - Y0)) * (H - 2 * PAD));

// 曲線 g(x) の折れ線（48点）。
const CURVE = Array.from({ length: 49 }, (_, i) => {
  const x = A + ((B - A) * i) / 48;
  return `${sx(x)},${sy(AREA_F(x))}`;
}).join(" ");

export function RiemannStepper() {
  const index = useCalculusStore((s) => s.frame.index);
  const count = useCalculusStore((s) => s.frame.count);
  const playing = useCalculusStore((s) => s.frame.playing);
  const nextFrame = useCalculusStore((s) => s.nextFrame);
  const prevFrame = useCalculusStore((s) => s.prevFrame);
  const goToFrame = useCalculusStore((s) => s.goToFrame);
  const setPlaying = useCalculusStore((s) => s.setPlaying);
  const setFrameCount = useCalculusStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildRiemannFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1500 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const showRects = (p?.stepIndex ?? -1) >= 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        リーマン和で面積を詰める（∫₀² (0.4x²+0.3) dx ＝ {EXACT_AREA.toFixed(3)}）
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="リーマン和による面積近似">
          {/* 短冊（矩形） */}
          {showRects && p
            ? p.rects.map((r, i) => {
                const top = sy(r.height);
                return (
                  <rect
                    key={i}
                    x={sx(r.x0)}
                    y={top}
                    width={round2(sx(r.x1) - sx(r.x0))}
                    height={round2(sy(0) - top)}
                    className="fill-blue-500/25 stroke-blue-500/70"
                    strokeWidth={0.8}
                  />
                );
              })
            : null}
          {/* x 軸 */}
          <line x1={sx(X0)} y1={sy(0)} x2={sx(X1)} y2={sy(0)} className="stroke-slate-400" />
          {/* 曲線 g(x) */}
          <polyline points={CURVE} fill="none" className="stroke-slate-800" strokeWidth={2} />
        </svg>
      </div>

      {showRects && p ? (
        <p className="text-center font-mono text-sm text-slate-700">
          n={p.n} 本 ／ 近似面積 {p.sum.toFixed(3)} ／ 真値 {p.exact.toFixed(3)}（差 {p.error.toFixed(3)}）
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で短冊の本数を 1→2→4→…→32 と倍にすると、青い矩形が曲線の下を埋め、総和（近似面積）が真の面積に収束します。これが «積分＝面積» の意味です。
      </p>
    </div>
  );
}
