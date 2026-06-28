"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useGofStore } from "@/lib/store/goodness-of-fit";
import { buildGofFrames } from "./frames";

/**
 * カイ二乗統計量を «カテゴリごとに» 積み上げるステッパー（描画層）。各目の寄与 (O−E)²/E を 1 つずつ
 * 加え、最後に合計が χ² になる過程をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 操作値（observed）は useGofStore が single source of truth、frame も同ストア。
 */
export function ChiSquareStepper() {
  const cells = useGofStore((s) => s.derived.cells);
  const df = useGofStore((s) => s.derived.df);
  const index = useGofStore((s) => s.frame.index);
  const count = useGofStore((s) => s.frame.count);
  const playing = useGofStore((s) => s.frame.playing);
  const nextFrame = useGofStore((s) => s.nextFrame);
  const prevFrame = useGofStore((s) => s.prevFrame);
  const goToFrame = useGofStore((s) => s.goToFrame);
  const setPlaying = useGofStore((s) => s.setPlaying);
  const setFrameCount = useGofStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildGofFrames(cells), [cells]);
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
  const curI = frame?.payload?.i ?? 0;
  const running = frame?.payload?.running ?? 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">χ² = Σ(Oᵢ−Eᵢ)²/Eᵢ を目ごとに積み上げる</p>

      <div className="flex items-end justify-center gap-2" data-testid="chi-cells">
        {cells.map((c, i) => {
          const revealed = i <= curI;
          const isCurrent = i === curI;
          return (
            <div
              key={i}
              className={`flex w-12 flex-col items-center rounded-lg border px-1 py-1.5 text-center transition ${
                isCurrent
                  ? "border-blue-500 bg-blue-50"
                  : revealed
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-40"
              }`}
            >
              <span className="text-[9px] text-slate-400">目{i + 1}</span>
              <span className="font-mono text-xs font-semibold text-slate-800">
                {revealed ? formatNumber(c.contribution, 2) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center font-mono text-sm text-slate-700">
        ここまでの χ² = {formatNumber(running, 2)}（df={df}）
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
        ▶ 再生で各目の寄与 (O−E)²/E が 1 つずつ加算され、合計が χ²
        になります。上のラボで観測を変えると寄与も変わります。
      </p>
    </div>
  );
}
