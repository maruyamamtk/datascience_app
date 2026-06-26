"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { formatNumber } from "@/components/math/tex";
import { simulateIntervals, type SimInterval } from "@/lib/stats/interval";
import { mulberry32 } from "@/lib/stats/random";
import { useIntervalStore } from "@/lib/store/interval";
import { buildCoverageFrames } from "./frames";

// 母平均 μ を 0 に固定（ラボの x̄=0 基準と揃える）。区間が μ を含むか／外すかを縦積みで見せる。
const MU = 0;
// コマ送りで見やすい本数に抑える（多すぎると 1 本が細くなる）。被覆率の収束は L1 の数値実験で補う。
const TRIALS = 30;

const COLOR_HIT = "#2563eb"; // 母平均を含む区間
const COLOR_MISS = "#dc2626"; // 母平均を外した区間

const W = 360;
const PAD = { top: 16, right: 16, bottom: 26, left: 16 };
const ROW_H = 9;

/**
 * 被覆シミュレーター（描画層）。母集団 N(μ,σ²) から n 個の標本を何度も引き、各標本の信頼区間を
 * 縦に積んで描く。母平均 μ を含む区間（青）／外す区間（赤）を 1 本ずつコマ送りで提示し、
 * 「区間の約 95% が母平均を含む」頻度論的意味を体感させる（受け入れ条件 / SPEC §4.4）。
 * 操作値（n・level・σ）は useIntervalStore が single source of truth、フレーム位置も同ストアの frame。
 */
export function CoverageSimulator() {
  const n = useIntervalStore((s) => s.controls.n);
  const level = useIntervalStore((s) => s.controls.level);
  const sigma = useIntervalStore((s) => s.controls.sigma);
  const index = useIntervalStore((s) => s.frame.index);
  const count = useIntervalStore((s) => s.frame.count);
  const playing = useIntervalStore((s) => s.frame.playing);
  const nextFrame = useIntervalStore((s) => s.nextFrame);
  const prevFrame = useIntervalStore((s) => s.prevFrame);
  const goToFrame = useIntervalStore((s) => s.goToFrame);
  const setPlaying = useIntervalStore((s) => s.setPlaying);
  const setFrameCount = useIntervalStore((s) => s.setFrameCount);

  const rngRef = useRef(mulberry32((Date.now() & 0xffffffff) >>> 0));
  const [intervals, setIntervals] = useState<SimInterval[]>([]);

  const drawNew = useCallback(() => {
    const ivs = simulateIntervals({ mu: MU, sigma, n, level, trials: TRIALS, rng: rngRef.current });
    setIntervals(ivs);
    setFrameCount(ivs.length);
    goToFrame(0);
    setPlaying(false);
  }, [sigma, n, level, setFrameCount, goToFrame, setPlaying]);

  // n・level・σ が変わったら標本群を引き直す（初回マウント含む）。
  useEffect(() => {
    drawNew();
  }, [drawNew]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 450,
  });

  const frames = useMemo(() => buildCoverageFrames(intervals, level), [intervals, level]);
  const frame = frameAt(frames, index);
  const revealedCount = frame?.payload?.step ?? 0;
  const hits = frame?.payload?.hits ?? 0;
  const rate = frame?.payload?.rate ?? 0;

  // 全区間から対称な固定軸（μ=0 中心）を作る。提示につれて軸が動かないよう全件で決める。
  const axis = useMemo(() => {
    let r = 1;
    for (const iv of intervals) {
      if (Number.isFinite(iv.lower)) r = Math.max(r, Math.abs(iv.lower));
      if (Number.isFinite(iv.upper)) r = Math.max(r, Math.abs(iv.upper));
    }
    const pad = r * 0.08;
    return { min: -(r + pad), max: r + pad };
  }, [intervals]);

  const chartH = PAD.top + TRIALS * ROW_H + PAD.bottom;
  const span = axis.max - axis.min || 1;
  const toX = (v: number) => PAD.left + ((v - axis.min) / span) * (W - PAD.left - PAD.right);
  const muX = toX(MU);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          母集団 N(μ={MU}, σ={formatNumber(sigma)}) から n={n} を {TRIALS} 回抽出 → 各
          {formatNumber(level * 100, 0)}% 区間
        </p>
        <button
          type="button"
          onClick={drawNew}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          新しい標本群を引く
        </button>
      </div>

      {/* 区間の縦積み（提示済みを開示、いま提示した 1 本を強調、含む=青 / 外す=赤） */}
      <svg
        viewBox={`0 0 ${W} ${chartH}`}
        className="h-auto w-full"
        role="img"
        aria-label="繰り返し標本抽出による信頼区間の被覆"
        data-testid="coverage-plot"
      >
        {/* 母平均 μ の基準線 */}
        <line x1={muX} y1={PAD.top - 8} x2={muX} y2={chartH - PAD.bottom + 4} stroke="#16a34a" strokeWidth={1.5} />
        <text x={muX} y={PAD.top - 11} textAnchor="middle" className="fill-green-700 text-[10px] font-semibold">
          μ = {MU}
        </text>

        {intervals.map((iv, i) => {
          const revealed = i < revealedCount;
          const isLatest = i === revealedCount - 1;
          const y = PAD.top + i * ROW_H + ROW_H / 2;
          if (!revealed) {
            return <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />;
          }
          const color = iv.contains ? COLOR_HIT : COLOR_MISS;
          const x1 = toX(Math.max(axis.min, iv.lower));
          const x2 = toX(Math.min(axis.max, iv.upper));
          return (
            <g key={i} opacity={isLatest ? 1 : 0.85}>
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={color}
                strokeWidth={isLatest ? 4 : 2.2}
                strokeLinecap="round"
              />
              <circle cx={toX(iv.mean)} cy={y} r={isLatest ? 2.6 : 1.8} fill={color} />
            </g>
          );
        })}

        {/* 軸ラベル */}
        <text x={PAD.left} y={chartH - 8} textAnchor="start" className="fill-slate-400 text-[10px]">
          {formatNumber(axis.min)}
        </text>
        <text x={W - PAD.right} y={chartH - 8} textAnchor="end" className="fill-slate-400 text-[10px]">
          {formatNumber(axis.max)}
        </text>
      </svg>

      {/* 集計（提示済み本数・被覆率を名目値と並べる） */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-4 rounded" style={{ backgroundColor: COLOR_HIT }} />
          μ を含む
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-4 rounded" style={{ backgroundColor: COLOR_MISS }} />
          μ を外す
        </span>
        <span className="font-mono text-slate-700">
          {revealedCount} 本中 {hits} 本が的中（被覆率 {formatNumber(rate * 100, 0)}% / 名目{" "}
          {formatNumber(level * 100, 0)}%）
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
        ヒント: ▶ 再生で区間が 1 本ずつ積み上がります。赤い区間（母平均を外した標本）は約{" "}
        {formatNumber((1 - level) * 100, 0)}% 出るはず。信頼係数や n
        を変えてから引き直すと、幅と外れ方が変わります。
      </p>
    </div>
  );
}
