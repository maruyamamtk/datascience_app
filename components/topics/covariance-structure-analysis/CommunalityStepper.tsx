"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { VARIABLE_NAMES, useFactorStore } from "@/lib/store/factor-analysis";
import { buildCommunalityFrames } from "./frames";

const W = 300;
const H = 110;

/**
 * 各観測変数の分散を «共通性＋独自性» に分解するステッパー（描画層）。変数を1つずつめくり、
 * λ²（共通因子）＋(1−λ²)（独自因子）=1 の積み木をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 負荷は上のラボと共有（useFactorStore）。フレーム位置は frame。
 */
export function CommunalityStepper() {
  const loadings = useFactorStore((s) => s.derived.loadings);
  const index = useFactorStore((s) => s.frame.index);
  const count = useFactorStore((s) => s.frame.count);
  const playing = useFactorStore((s) => s.frame.playing);
  const nextFrame = useFactorStore((s) => s.nextFrame);
  const prevFrame = useFactorStore((s) => s.prevFrame);
  const goToFrame = useFactorStore((s) => s.goToFrame);
  const setPlaying = useFactorStore((s) => s.setPlaying);
  const setFrameCount = useFactorStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildCommunalityFrames(VARIABLE_NAMES, loadings), [loadings]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1300,
  });

  const frame = frameAt(frames, index);
  const barW = W - 80;
  const h2 = frame?.payload?.communality ?? 0;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        各変数の «分散1 = 共通性 + 独自性» を分解
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="共通性分解"
        data-testid="communality-bars"
      >
        {frames.map((f, i) => {
          const revealed = i <= index;
          const fh2 = f.payload?.communality ?? 0;
          const y = 14 + i * 22;
          return (
            <g key={i} opacity={revealed ? 1 : 0.2}>
              <text x={4} y={y + 11} className="fill-slate-600 text-[9px]">
                {f.payload?.name}
              </text>
              <rect x={40} y={y} width={barW * fh2} height={14} fill="#2563eb" rx={2} />
              <rect
                x={40 + barW * fh2}
                y={y}
                width={barW * (1 - fh2)}
                height={14}
                fill="#fcd34d"
                rx={2}
              />
              {i === index && (
                <text x={40 + barW + 4} y={y + 11} className="fill-slate-500 text-[8px]">
                  h²={fh2.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        {frame?.payload?.name}・λ={(frame?.payload?.loading ?? 0).toFixed(2)}・共通性=
        {h2.toFixed(2)}・独自性={(1 - h2).toFixed(2)}
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
        ▶ 青=共通性（共通因子
        λ²）／黄=独自性（1−λ²）。負荷が大きい変数ほど青が長い＝因子とよく結びつく。上のラボで倍率を変えると分解も変化。
      </p>
    </div>
  );
}
