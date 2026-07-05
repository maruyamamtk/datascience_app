"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, isHighlighted, useFramePlayer } from "@/components/viz";
import { useDigitalInformationBasicsStore } from "@/lib/store/digital-information-basics";
import { buildBinaryFrames, STEP_BINARY, STEP_N } from "./frames";

/**
 * 「10 進 → 2 進」変換ステッパー（描画層）。2 で割り続けて商と余りを 1 行ずつ明かし、
 * 余りを «下から» 読むと 2 進表記になる様子をコマ送りで見せる。フレーム位置は共有ストアの frame。
 */
export function BinaryConversionStepper() {
  const index = useDigitalInformationBasicsStore((s) => s.frame.index);
  const count = useDigitalInformationBasicsStore((s) => s.frame.count);
  const playing = useDigitalInformationBasicsStore((s) => s.frame.playing);
  const nextFrame = useDigitalInformationBasicsStore((s) => s.nextFrame);
  const prevFrame = useDigitalInformationBasicsStore((s) => s.prevFrame);
  const goToFrame = useDigitalInformationBasicsStore((s) => s.goToFrame);
  const setPlaying = useDigitalInformationBasicsStore((s) => s.setPlaying);
  const setFrameCount = useDigitalInformationBasicsStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBinaryFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const resultOn = isHighlighted(frame, "result");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        10 進 {STEP_N} を 2 進数に変換（2 で割り続け、余りを下から読む）
      </p>

      {p ? (
        <div className="flex flex-col items-center gap-3">
          {/* 割り算の表 */}
          <div className="inline-block font-mono text-sm">
            {p.steps.map((s, i) => {
              const revealed = i < p.revealed;
              const current = i === p.k;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-0.5 ${
                    current ? "bg-amber-100" : "bg-transparent"
                  } ${revealed ? "opacity-100" : "opacity-25"}`}
                >
                  <span className="w-8 text-right text-slate-700">{s.dividend}</span>
                  <span className="text-slate-400">÷ 2 =</span>
                  <span className="w-6 text-right text-slate-700">{s.quotient}</span>
                  <span className="text-slate-400">余り</span>
                  <span
                    className={`w-5 text-center font-bold ${
                      current ? "text-amber-700" : "text-violet-600"
                    }`}
                  >
                    {revealed ? s.remainder : "?"}
                  </span>
                  {revealed ? <span className="text-slate-300">← 桁</span> : null}
                </div>
              );
            })}
          </div>

          {/* 下から読んだ 2 進文字列 */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500">余りを下から読む →</span>
            <span
              className={`rounded px-2 py-1 font-mono text-lg font-bold tracking-widest ${
                resultOn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-800"
              }`}
            >
              {p.binarySoFar}
              <sub className="text-xs font-normal">(2)</sub>
            </span>
          </div>
          {resultOn ? (
            <p className="text-center font-mono text-sm text-emerald-700">
              {STEP_N}₁₀ = {STEP_BINARY}₂
            </p>
          ) : null}
        </div>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で 1 回ずつ «2 で割った余り» が決まります。余りは必ず 0 か 1（＝その桁のビット）。商が 0 になったら、
        余りを <span className="font-semibold">下から上へ</span> 並べたものが 2 進表記です。桁の重みは下から 1・2・4・8…（2 の冪）。
      </p>
    </div>
  );
}
