"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useNormalTestStore } from "@/lib/store/normal-tests";
import { buildTtestFrames } from "./frames";

/**
 * 2標本 t 検定の «手順» を 1 ステップずつ組み立てるステッパー（描画層）。
 * 平均差 → プールSD → SE → t → p と段階的に確定値を積み上げる（アルゴリズム図鑑スタイル）。
 * 操作値（meanDiff/sd/n）は useNormalTestStore が single source of truth、frame も同ストア。
 */
export function TtestStepper() {
  const { meanDiff, sd, n } = useNormalTestStore((s) => s.controls);
  const index = useNormalTestStore((s) => s.frame.index);
  const count = useNormalTestStore((s) => s.frame.count);
  const playing = useNormalTestStore((s) => s.frame.playing);
  const nextFrame = useNormalTestStore((s) => s.nextFrame);
  const prevFrame = useNormalTestStore((s) => s.prevFrame);
  const goToFrame = useNormalTestStore((s) => s.goToFrame);
  const setPlaying = useNormalTestStore((s) => s.setPlaying);
  const setFrameCount = useNormalTestStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildTtestFrames({ meanDiff, sd, n }), [meanDiff, sd, n]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1100,
  });

  const frame = frameAt(frames, index);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        2標本 t 検定の手順（上のラボの Δ={formatNumber(meanDiff)}, s={formatNumber(sd)}, n={n}）
      </p>

      <ol className="space-y-2" data-testid="ttest-steps">
        {frames.map((f, i) => {
          const revealed = i <= index;
          const current = i === index;
          return (
            <li
              key={i}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                current
                  ? "border-blue-500 bg-blue-50"
                  : revealed
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 opacity-40"
              }`}
            >
              <span className={revealed ? "text-slate-700" : "text-slate-300"}>
                {f.payload?.label}
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {revealed ? formatNumber(f.payload?.value ?? 0, 3) : "—"}
              </span>
            </li>
          );
        })}
      </ol>

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
        ▶ 再生で «平均差 → ばらつきで標準化 → t → p»
        と手順が進みます。上のラボで設定を変えると各ステップの数値も変わります。
      </p>
    </div>
  );
}
