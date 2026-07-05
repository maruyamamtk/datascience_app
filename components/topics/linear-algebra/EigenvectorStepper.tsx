"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useLinearAlgebraStore } from "@/lib/store/linear-algebra";
import { type Vec2 } from "@/lib/stats/linear-algebra";
import { buildEigenvectorFrames } from "./frames";

/**
 * 「固有ベクトルを探す」ステッパー（描画層）。探針ベクトル（青）を単位円上で回し、
 * 像 A·v（赤）が探針と一直線になる向き＝固有ベクトルを1コマずつ探す（アルゴリズム図鑑スタイル）。
 * フレーム位置は共有ストアの frame。
 */

const SIZE = 240;
const CENTER = SIZE / 2;
const UNIT = 48;
const round2 = (v: number) => Math.round(v * 100) / 100;
const sx = (x: number) => round2(CENTER + x * UNIT);
const sy = (y: number) => round2(CENTER - y * UNIT);

function Arrow({ to, color, width = 2 }: { to: Vec2; color: string; width?: number }) {
  const tipX = sx(to.x);
  const tipY = sy(to.y);
  const ang = Math.atan2(tipY - CENTER, tipX - CENTER);
  const size = 7;
  const p1x = round2(tipX - size * Math.cos(ang - 0.4));
  const p1y = round2(tipY - size * Math.sin(ang - 0.4));
  const p2x = round2(tipX - size * Math.cos(ang + 0.4));
  const p2y = round2(tipY - size * Math.sin(ang + 0.4));
  return (
    <g>
      <line x1={CENTER} y1={CENTER} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} />
      <polygon points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
    </g>
  );
}

export function EigenvectorStepper() {
  const index = useLinearAlgebraStore((s) => s.frame.index);
  const count = useLinearAlgebraStore((s) => s.frame.count);
  const playing = useLinearAlgebraStore((s) => s.frame.playing);
  const nextFrame = useLinearAlgebraStore((s) => s.nextFrame);
  const prevFrame = useLinearAlgebraStore((s) => s.prevFrame);
  const goToFrame = useLinearAlgebraStore((s) => s.goToFrame);
  const setPlaying = useLinearAlgebraStore((s) => s.setPlaying);
  const setFrameCount = useLinearAlgebraStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildEigenvectorFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1600 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">固有ベクトルを探す（A=[[2,1],[1,2]]・探針を回す）</p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[240px]" role="img" aria-label="固有ベクトル探索">
          {/* 軸 */}
          <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} className="stroke-slate-200" />
          <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} className="stroke-slate-200" />
          <circle cx={CENTER} cy={CENTER} r={UNIT} fill="none" className="stroke-slate-200" strokeDasharray="3 3" />
          {/* 固有方向のガイド線（一直線になったとき緑で強調） */}
          {p?.isEigen ? (
            <line
              x1={sx(-3 * p.probe.x)}
              y1={sy(-3 * p.probe.y)}
              x2={sx(3 * p.probe.x)}
              y2={sy(3 * p.probe.y)}
              className="stroke-green-500/50"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          ) : null}
          {/* 像 A·v（赤）と探針 v（青） */}
          {p ? <Arrow to={p.image} color="#e11d48" /> : null}
          {p ? <Arrow to={p.probe} color="#2563eb" width={2.5} /> : null}
        </svg>
      </div>

      {p && p.stepIndex >= 0 ? (
        <p className="text-center font-mono text-sm text-slate-700">
          探針 {p.angleDeg}° ／ 像とのなす角 {p.imageAngle.toFixed(0)}°
          {p.isEigen ? ` → 固有ベクトル（λ=${p.scale.toFixed(1)}）` : ""}
        </p>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で青い探針を回すと、赤い像 <span className="font-mono">A·v</span> の向きがついてきます。両者が «一直線» に重なる角度が固有ベクトル、そのときの伸び率が固有値 λ です。
      </p>
    </div>
  );
}
