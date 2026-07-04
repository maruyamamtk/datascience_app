"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useMissingStore } from "@/lib/store/missing-data";
import { buildImputationFrames } from "./frames";

/**
 * 欠測処理の «欠測発生→完全ケース→平均代入→回帰代入→確率的回帰代入» を1コマずつ見せるステッパー（描画層）。
 * 各段階の推定平均バー（真値ライン）と SD 比バーを重ねる（アルゴリズム図鑑スタイル）。フレーム位置は共有ストアの frame。
 */
export function ImputationStepper() {
  const index = useMissingStore((s) => s.frame.index);
  const count = useMissingStore((s) => s.frame.count);
  const playing = useMissingStore((s) => s.frame.playing);
  const nextFrame = useMissingStore((s) => s.nextFrame);
  const prevFrame = useMissingStore((s) => s.prevFrame);
  const goToFrame = useMissingStore((s) => s.goToFrame);
  const setPlaying = useMissingStore((s) => s.setPlaying);
  const setFrameCount = useMissingStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildImputationFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 2600 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const biasOk = p ? Math.abs(p.meanBias) < 0.2 : false;
  const sdOk = p ? Math.abs(p.sdRatio - 1) < 0.1 : false;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">補完法の比較（固定 MAR：高い Y が抜ける）</p>

      {p ? (
        <div className="space-y-3 rounded-xl bg-slate-50 px-4 py-4">
          {/* 平均バイアス */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">{p.estimate.label} の平均</span>
              <span className={biasOk ? "text-emerald-600" : "text-red-600"}>{p.estimate.mean.toFixed(2)}（真値 {p.trueMean.toFixed(2)}・バイアス {p.meanBias >= 0 ? "+" : ""}{p.meanBias.toFixed(2)}）</span>
            </div>
            <div className="relative h-4 w-full rounded bg-slate-200">
              <div className={`h-full rounded ${biasOk ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, (p.estimate.mean / (p.trueMean * 1.3)) * 100)}%` }} />
              <div className="absolute top-0 h-4 border-l-2 border-dashed border-emerald-700" style={{ left: `${Math.min(100, (p.trueMean / (p.trueMean * 1.3)) * 100)}%` }} title="真の平均" />
            </div>
          </div>
          {/* SD 比 */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">ばらつき SD の保持</span>
              <span className={sdOk ? "text-emerald-600" : "text-amber-600"}>{p.estimate.sd.toFixed(2)}（真値 {p.trueSd.toFixed(2)}・比 {p.sdRatio.toFixed(2)}）</span>
            </div>
            <div className="relative h-4 w-full rounded bg-slate-200">
              <div className={`h-full rounded ${sdOk ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${Math.min(100, p.sdRatio * 76)}%` }} />
              <div className="absolute top-0 h-4 border-l-2 border-dashed border-emerald-700" style={{ left: "76%" }} title="真の SD（比=1）" />
            </div>
          </div>
        </div>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で «欠測発生→完全ケース→平均代入→回帰代入→確率的回帰代入» と進みます。④で平均が、⑤でばらつきも真値（緑破線）に戻ります。
      </p>
    </div>
  );
}
