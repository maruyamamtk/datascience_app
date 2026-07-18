"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, isHighlighted, useFramePlayer } from "@/components/viz";
import { CLASS_STATS, CLASS_TRAIN, NB_ELLIPSES_1SD, useNaiveBayesStepperStore } from "@/lib/store/naive-bayes-knn";
import { buildNaiveBayesFrames } from "./nb-frames";

const round2 = (v: number) => Math.round(v * 100) / 100;
const W = 300;
const H = 260;
const PAD = 22;
const SCALE = W - 2 * PAD;
const px = (v: number) => round2(PAD + v * SCALE);
const py = (v: number) => round2(PAD + (1 - v) * SCALE);
const pr = (v: number) => round2(v * SCALE);

const LABEL_FILL = { 0: "#2563eb", 1: "#d97706" } as const;
const LABEL_STROKE = { 0: "#1d4ed8", 1: "#b45309" } as const;

/**
 * 「ナイーブベイズの尤度計算」ステッパー（Level1）。固定の «新しい点» について、
 * 事前確率→x₁の尤度→x₂の尤度→未正規化スコア→正規化した事後確率・最終決定、の5コマで
 * ベイズの定理 P(k|x)∝π_k·p(x1|k)·p(x2|k) の中身を1つずつ追う。
 */
export function NaiveBayesStepper() {
  const index = useNaiveBayesStepperStore((s) => s.frame.index);
  const count = useNaiveBayesStepperStore((s) => s.frame.count);
  const playing = useNaiveBayesStepperStore((s) => s.frame.playing);
  const nextFrame = useNaiveBayesStepperStore((s) => s.nextFrame);
  const prevFrame = useNaiveBayesStepperStore((s) => s.prevFrame);
  const goToFrame = useNaiveBayesStepperStore((s) => s.goToFrame);
  const setPlaying = useNaiveBayesStepperStore((s) => s.setPlaying);
  const setFrameCount = useNaiveBayesStepperStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildNaiveBayesFrames(CLASS_STATS), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;
  const query = p?.query;
  const showClass0 = isHighlighted(frame, "class0") || p?.stage === "prior";
  const showClass1 = isHighlighted(frame, "class1") || p?.stage === "prior";
  const showX1Line = isHighlighted(frame, "x1line");
  const showX2Line = isHighlighted(frame, "x2line");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        ナイーブベイズの尤度計算：新しい点 x=({query?.x1.toFixed(2)}, {query?.x2.toFixed(2)}) を、事前確率×尤度×尤度の順に1つずつ計算する
      </p>

      {p && query ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="ナイーブベイズ尤度計算の過程">
              <rect x={PAD} y={PAD} width={SCALE} height={SCALE} fill="none" className="stroke-slate-300" />

              {([0, 1] as const).map((label) => {
                const active = label === 0 ? showClass0 : showClass1;
                const isWinner = (isHighlighted(frame, "class0") && label === 0) || (isHighlighted(frame, "class1") && label === 1);
                return (
                  <ellipse
                    key={`e${label}`}
                    cx={px(NB_ELLIPSES_1SD[label].cx)}
                    cy={py(NB_ELLIPSES_1SD[label].cy)}
                    rx={pr(NB_ELLIPSES_1SD[label].rx)}
                    ry={pr(NB_ELLIPSES_1SD[label].ry)}
                    fill="none"
                    stroke={LABEL_STROKE[label]}
                    strokeWidth={isWinner ? 2.6 : 1.4}
                    opacity={active ? 1 : 0.25}
                  />
                );
              })}

              {showX1Line ? (
                <line x1={px(query.x1)} y1={py(1)} x2={px(query.x1)} y2={py(0)} stroke="#0f172a" strokeWidth={1.2} strokeDasharray="4 3" />
              ) : null}
              {showX2Line ? (
                <line x1={px(0)} y1={py(query.x2)} x2={px(1)} y2={py(query.x2)} stroke="#0f172a" strokeWidth={1.2} strokeDasharray="4 3" />
              ) : null}

              {CLASS_TRAIN.map((pt, i) => (
                <circle key={`p${i}`} cx={px(pt.x1)} cy={py(pt.x2)} r={2.4} fill={LABEL_FILL[pt.label]} opacity={0.35} />
              ))}

              <rect
                x={round2(px(query.x1) - 6)}
                y={round2(py(query.x2) - 6)}
                width={12}
                height={12}
                fill="#0f172a"
                stroke="#fff"
                strokeWidth={1.5}
                transform={`rotate(45 ${px(query.x1)} ${py(query.x2)})`}
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <Stat value={`π₀=${p.prediction.prior[0].toFixed(2)} / π₁=${p.prediction.prior[1].toFixed(2)}`} label="事前確率" tone="blue" />
            <Stat
              value={`${(p.prediction.posterior[0] * 100).toFixed(1)}% / ${(p.prediction.posterior[1] * 100).toFixed(1)}%`}
              label="事後確率 P(0|x) / P(1|x)"
              tone="emerald"
            />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer count={count} index={index} playing={playing} onPrev={prevFrame} onNext={nextFrame} onSeek={goToFrame} onTogglePlay={() => setPlaying(!playing)} />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 再生で「事前確率→x₁の尤度→x₂の尤度→未正規化スコア→事後確率」の順に進みます。青=クラス0の分布、橙=クラス1の分布。太い実線＝そのコマで比較している/勝った分布。
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: "blue" | "emerald" }) {
  const bg = { blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
