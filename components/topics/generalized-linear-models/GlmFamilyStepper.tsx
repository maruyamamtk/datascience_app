"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useGlmStore } from "@/lib/store/generalized-linear-models";
import { buildFamilyFrames } from "./frames";

const W = 360;
const H = 150;
const PAD = { top: 14, right: 14, bottom: 24, left: 30 };
const X_MIN = -2;
const X_MAX = 4;

/**
 * GLM «族ギャラリー» ステッパー（描画層）。正規（恒等）→二項（ロジット）→ポアソン（対数）と、
 * 同じ線形予測子 η=b0+b1x を各リンクの逆関数で平均 μ に写す曲線を切り替え、«統一構造» を見せる
 * （アルゴリズム図鑑スタイル）。フレーム位置は useGlmStore の frame。
 */
export function GlmFamilyStepper() {
  const index = useGlmStore((s) => s.frame.index);
  const count = useGlmStore((s) => s.frame.count);
  const playing = useGlmStore((s) => s.frame.playing);
  const nextFrame = useGlmStore((s) => s.nextFrame);
  const prevFrame = useGlmStore((s) => s.prevFrame);
  const goToFrame = useGlmStore((s) => s.goToFrame);
  const setPlaying = useGlmStore((s) => s.setPlaying);
  const setFrameCount = useGlmStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildFamilyFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1600,
  });

  const frame = frameAt(frames, index);
  const curve = frame?.payload?.curve ?? [];
  const mus = curve.map((p) => p.mu);
  const muMin = Math.min(...mus, 0);
  const muMax = Math.max(...mus, 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toY = (mu: number) => PAD.top + (1 - (mu - muMin) / (muMax - muMin || 1)) * plotH;
  const path = curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.mu).toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        同じ線形予測子 η=b0+b1x を «リンクの逆関数» で平均 μ に写す
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="GLM族の平均曲線"
        data-testid="glm-family"
      >
        <line x1={PAD.left} y1={toY(muMin)} x2={W - PAD.right} y2={toY(muMin)} stroke="#e2e8f0" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth={2.5} />
      </svg>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm">
        <span className="font-semibold text-slate-800">{frame?.payload?.label}</span>
        <span className="ml-2 font-mono text-xs text-slate-600">
          応答={frame?.payload?.responseType}・{frame?.payload?.link}
        </span>
      </div>

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
        ▶ 恒等（直線）→ ロジット（S字 0〜1）→ 対数（指数,
        正）。応答の型に合わせてリンクを選ぶのが一般化線形モデル。
      </p>
    </div>
  );
}
