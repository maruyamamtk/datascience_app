"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useAbStore } from "@/lib/store/ab-testing";
import { buildPeekingFrames } from "./frames";

/**
 * «途中で覗くと第一種の過誤が膨らむ»（peeking）をコマ送りで見せるステッパー（描画層）。
 * チェック回数 1→2→5→10→20 と進めるほど実効的な過誤バーが名目5%ラインを超えて伸びる
 * （アルゴリズム図鑑スタイル）。フレーム位置は共有ストアの frame。
 */
export function PeekingStepper() {
  const index = useAbStore((s) => s.frame.index);
  const count = useAbStore((s) => s.frame.count);
  const playing = useAbStore((s) => s.frame.playing);
  const nextFrame = useAbStore((s) => s.nextFrame);
  const prevFrame = useAbStore((s) => s.prevFrame);
  const goToFrame = useAbStore((s) => s.goToFrame);
  const setPlaying = useAbStore((s) => s.setPlaying);
  const setFrameCount = useAbStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildPeekingFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2000 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const fpRate = p?.fpRate ?? 0;
  const alpha = p?.alpha ?? 0.05;
  // バーのスケール：0〜最大30%を全幅に。
  const scale = (v: number) => Math.min(100, (v / 0.3) * 100);
  const inflated = fpRate > alpha + 0.005;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">覗き見（peeking）で膨らむ第一種の過誤（A/A 実験）</p>

      <div className="rounded-xl bg-slate-50 px-4 py-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>チェック回数 {p?.looks} 回</span>
          <span className={inflated ? "font-semibold text-red-600" : "text-emerald-600"}>実効過誤 {(fpRate * 100).toFixed(1)}%</span>
        </div>
        <div className="relative h-8 w-full rounded bg-slate-200">
          <div className={`h-full rounded ${inflated ? "bg-red-500" : "bg-emerald-500"} transition-all`} style={{ width: `${scale(fpRate)}%` }} />
          {/* 名目 alpha ライン */}
          <div className="absolute top-0 h-8 border-l-2 border-dashed border-slate-700" style={{ left: `${scale(alpha)}%` }} title="名目5%" />
          <span className="absolute -top-0.5 text-[9px] text-slate-600" style={{ left: `calc(${scale(alpha)}% + 2px)` }}>名目 {(alpha * 100).toFixed(0)}%</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">緑＝名目水準内 / 赤＝膨張。破線は正しく制御された 5%。</p>
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «1回→2→5→10→20回» とチェック回数を増やします。真に差がない実験でも、覗く回数が増えるほど «偶然どこかで有意» になり誤検出が膨らみます。
      </p>
    </div>
  );
}
