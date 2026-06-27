"use client";

import { useEffect, useMemo } from "react";
import { formatNumber } from "@/components/math/tex";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { naturalFrequencies } from "@/lib/stats/bayes";
import { useProbabilityStore } from "@/lib/store/probability-basics";
import { COLOR_FN, COLOR_FP, COLOR_TN, COLOR_TP } from "./MosaicPlot";
import { buildBayesFrames, type BayesStage } from "./frames";

const W = 360;
const BAR_H = 40;
const PAD_X = 12;

// 段階ごとに各セグメントへ与える色（未開示はグレー）。
function segColor(stage: BayesStage, seg: "tp" | "fn" | "fp" | "tn"): string {
  const GRAY = "#e2e8f0";
  if (stage === "population") return GRAY;
  if (stage === "disease") {
    // 病気(TP+FN) vs 健康(FP+TN) の 2 色。
    return seg === "tp" || seg === "fn" ? "#93c5fd" : "#fecaca";
  }
  // test / posterior は 4 色。posterior では陰性側を淡くする。
  const full = { tp: COLOR_TP, fn: COLOR_FN, fp: COLOR_FP, tn: COLOR_TN }[seg];
  if (stage === "posterior" && (seg === "fn" || seg === "tn")) return "#f1f5f9";
  return full;
}

/**
 * 自然頻度によるベイズ更新ステッパー（描画層）。母集団 N 人を横帯で表し、
 * 「母集団 → 事前確率で病気/健康 → 検査で陽性/陰性 → 陽性者の中の病気割合（事後確率）」を
 * 1 コマずつ提示する（StepPlayer, アルゴリズム図鑑スタイル / SPEC §4.4）。
 * 操作値（prior/感度/特異度）は useProbabilityStore が single source of truth、フレーム位置も同ストア。
 */
export function BayesStepper() {
  const prior = useProbabilityStore((s) => s.controls.prior);
  const sensitivity = useProbabilityStore((s) => s.controls.sensitivity);
  const specificity = useProbabilityStore((s) => s.controls.specificity);
  const index = useProbabilityStore((s) => s.frame.index);
  const count = useProbabilityStore((s) => s.frame.count);
  const playing = useProbabilityStore((s) => s.frame.playing);
  const nextFrame = useProbabilityStore((s) => s.nextFrame);
  const prevFrame = useProbabilityStore((s) => s.prevFrame);
  const goToFrame = useProbabilityStore((s) => s.goToFrame);
  const setPlaying = useProbabilityStore((s) => s.setPlaying);
  const setFrameCount = useProbabilityStore((s) => s.setFrameCount);

  const freq = useMemo(
    () => naturalFrequencies({ prior, sensitivity, specificity }),
    [prior, sensitivity, specificity],
  );
  const frames = useMemo(() => buildBayesFrames(freq), [freq]);

  // フレーム総数（=4）を設定。controls 変化で内訳は変わるが段数は同じ。
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
  const stage: BayesStage = frame?.payload?.stage ?? "population";
  const posterior = frame?.payload?.posterior ?? Number.NaN;

  const total = freq.total || 1;
  const toW = (count_: number) => (count_ / total) * (W - PAD_X * 2);
  // セグメント並び: 病気(TP,FN) → 健康(FP,TN)。病気/健康のまとまりが見えるよう隣接させる。
  const segs: { key: "tp" | "fn" | "fp" | "tn"; n: number }[] = [
    { key: "tp", n: freq.tp },
    { key: "fn", n: freq.fn },
    { key: "fp", n: freq.fp },
    { key: "tn", n: freq.tn },
  ];
  let x = PAD_X;
  const placed = segs.map((s) => {
    const w = toW(s.n);
    const rect = { ...s, x, w };
    x += w;
    return rect;
  });

  // 陽性者だけの抽出帯（posterior 段階で表示）: [TP|FP]。
  const posTotal = freq.positives || 1;
  const tpW = (freq.tp / posTotal) * (W - PAD_X * 2);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        母集団 {freq.total} 人（有病率 {formatNumber(prior * 100, 1)}%・感度{" "}
        {formatNumber(sensitivity * 100, 0)}%・特異度 {formatNumber(specificity * 100, 0)}%）
      </p>

      <svg
        viewBox={`0 0 ${W} ${stage === "posterior" ? 150 : 96}`}
        className="h-auto w-full"
        role="img"
        aria-label="自然頻度によるベイズ更新の段階的分割"
        data-testid="bayes-stepper"
      >
        {/* メインの横帯（N 人を TP・FN・FP・TN に分割） */}
        {placed.map((s) => (
          <g key={s.key}>
            <rect
              x={s.x}
              y={20}
              width={Math.max(0, s.w)}
              height={BAR_H}
              fill={segColor(stage, s.key)}
              stroke="#ffffff"
              strokeWidth={1}
            />
          </g>
        ))}
        {/* 病気/健康の区切りラベル */}
        {stage !== "population" && (
          <>
            <text x={PAD_X} y={14} className="fill-blue-700 text-[10px] font-semibold">
              病気 {freq.sick}
            </text>
            <text
              x={PAD_X + toW(freq.sick)}
              y={14}
              className="fill-red-700 text-[10px] font-semibold"
            >
              健康 {freq.healthy}
            </text>
          </>
        )}
        {(stage === "test" || stage === "posterior") && (
          <text x={W / 2} y={76} textAnchor="middle" className="fill-slate-500 text-[10px]">
            真陽性 {freq.tp}／偽陰性 {freq.fn}／偽陽性 {freq.fp}／真陰性 {freq.tn}
          </text>
        )}

        {/* posterior 段階: 陽性者だけを抜き出した帯（TP|FP）と P(D|+) */}
        {stage === "posterior" && (
          <>
            <text x={PAD_X} y={104} className="fill-slate-700 text-[10px] font-semibold">
              陽性（+）の {freq.positives} 人だけを取り出すと…
            </text>
            <rect x={PAD_X} y={110} width={Math.max(0, tpW)} height={26} fill={COLOR_TP} />
            <rect
              x={PAD_X + tpW}
              y={110}
              width={Math.max(0, W - PAD_X * 2 - tpW)}
              height={26}
              fill={COLOR_FP}
            />
            <text
              x={PAD_X + tpW / 2}
              y={127}
              textAnchor="middle"
              className="fill-white text-[10px] font-bold"
            >
              病気 {freq.tp}
            </text>
            <text x={W - PAD_X} y={146} textAnchor="end" className="fill-red-700 text-[10px]">
              偽陽性 {freq.fp}
            </text>
            <text x={PAD_X} y={146} textAnchor="start" className="fill-blue-700 text-[10px]">
              P(D|+) = {formatNumber(posterior * 100, 0)}%
            </text>
          </>
        )}
      </svg>

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
        ▶ 再生で «母集団 → 病気/健康 → 検査結果 → 陽性者の中の病気割合» と分割が進みます。
        上の操作ラボで有病率を上げてからここを見ると、事後確率が大きく変わります。
      </p>
    </div>
  );
}
