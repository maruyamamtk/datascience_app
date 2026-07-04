"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useMonteCarloStore } from "@/lib/store/monte-carlo-methods";
import { buildBootstrapFrames } from "./frames";

const W = 320;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 26, left: 12 };
/** ヒストグラムの範囲（元標本の平均が収まる範囲）。 */
const LO = 4;
const HI = 12;
const BINS = 24;

/** stats 値をビン番号に。 */
function binOf(v: number): number {
  const b = Math.floor(((v - LO) / (HI - LO)) * BINS);
  return Math.max(0, Math.min(BINS - 1, b));
}

/**
 * ブートストラップの «復元抽出→分布→信頼区間» を1コマずつ見せるステッパー（描画層）。
 * 各再標本の平均をヒストグラムに積み上げ、最後にパーセンタイル信頼区間を帯で示す
 * （アルゴリズム図鑑スタイル）。フレーム位置は共有ストアの frame。
 */
export function BootstrapStepper() {
  const index = useMonteCarloStore((s) => s.frame.index);
  const count = useMonteCarloStore((s) => s.frame.count);
  const playing = useMonteCarloStore((s) => s.frame.playing);
  const nextFrame = useMonteCarloStore((s) => s.nextFrame);
  const prevFrame = useMonteCarloStore((s) => s.prevFrame);
  const goToFrame = useMonteCarloStore((s) => s.goToFrame);
  const setPlaying = useMonteCarloStore((s) => s.setPlaying);
  const setFrameCount = useMonteCarloStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildBootstrapFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 950,
  });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const stats = useMemo(() => p?.stats ?? [], [p]);

  // ヒストグラム集計。
  const hist = useMemo(() => {
    const h = new Array(BINS).fill(0);
    for (const v of stats) h[binOf(v)]++;
    return h;
  }, [stats]);
  const maxCount = Math.max(1, ...hist);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const binW = plotW / BINS;
  const toX = (v: number) => PAD.left + ((v - LO) / (HI - LO)) * plotW;
  const toY = (c: number) => PAD.top + (1 - c / maxCount) * plotH;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">ブートストラップ分布の構築</p>

      {/* 元標本と直近の再標本 */}
      <div className="flex flex-wrap items-center gap-1 text-[10px]">
        <span className="mr-1 font-semibold text-slate-500">元標本:</span>
        {p?.sample.map((v, i) => (
          <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
            {v}
          </span>
        ))}
      </div>
      {p?.drawn ? (
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="mr-1 font-semibold text-emerald-600">再標本:</span>
          {p.drawn.map((v, i) => (
            <span
              key={i}
              className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700"
            >
              {v}
            </span>
          ))}
          <span className="ml-1 text-slate-500">→ 平均 {(p.drawn.reduce((a, b) => a + b, 0) / p.drawn.length).toFixed(2)}</span>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ブートストラップ分布"
        data-testid="bootstrap-hist"
      >
        {/* 信頼区間の帯 */}
        {p?.ci ? (
          <rect
            x={toX(p.ci[0])}
            y={PAD.top}
            width={toX(p.ci[1]) - toX(p.ci[0])}
            height={plotH}
            fill="#93c5fd"
            opacity={0.3}
          />
        ) : null}
        {/* ヒストグラム */}
        {hist.map((c, i) => (
          <rect
            key={i}
            x={PAD.left + i * binW + 0.5}
            y={toY(c)}
            width={binW - 1}
            height={toY(0) - toY(c)}
            fill="#6366f1"
            opacity={0.8}
          />
        ))}
        {/* 元標本の平均（基準線） */}
        {p ? (
          <line
            x1={toX(p.sampleMean)}
            y1={PAD.top}
            x2={toX(p.sampleMean)}
            y2={toY(0)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        ) : null}
        {/* 軸目盛 */}
        {[LO, (LO + HI) / 2, HI].map((v) => (
          <text
            key={v}
            x={toX(v)}
            y={H - 9}
            textAnchor="middle"
            className="fill-slate-400 text-[8px]"
          >
            {v}
          </text>
        ))}
      </svg>

      <p className="text-center font-mono text-xs text-slate-700">
        積んだ再標本 {stats.length}・SE={(p?.se ?? 0).toFixed(3)}
        {p?.ci ? ` ・95%CI [${p.ci[0].toFixed(2)}, ${p.ci[1].toFixed(2)}]` : ""}
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
        ▶ 破線が元標本の平均。再生すると復元抽出の平均が積み上がり、釣鐘型の分布（＝標本平均の標本分布の推定）と、その2.5〜97.5%点の帯（信頼区間）ができます。
      </p>
    </div>
  );
}
