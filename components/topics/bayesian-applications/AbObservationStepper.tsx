"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { AB_OBSERVATIONS, betaPdfCurve, type AbSequentialStep } from "@/lib/stats/bayesian-applications";
import { AB_SEQUENTIAL_STEPS, useBayesianApplicationsStore } from "@/lib/store/bayesian-applications";
import { buildAbObservationFrames } from "./frames";
import { pct, round2 } from "./format";

// AbBayesLab(同一ページ)と同じ項名(aA/bA/aB/bB/pHat)を使うとDOM idが重複するため、
// このステッパー専用の接頭辞"step"で名前空間を分離する(tasks/lessons.md #78の教訓)。
const FORMULA = `\\theta_A\\sim\\mathrm{Beta}(${term("stepAA", "?")},${term("stepBA", "?")}),\\quad\\theta_B\\sim\\mathrm{Beta}(${term(
  "stepAB",
  "?",
)},${term("stepBB", "?")})\\quad\\Rightarrow\\quad \\hat P(\\theta_B>\\theta_A)=${term("stepPHat", "?")}`;

const COLOR_A = "#64748b";
const COLOR_B = "#2563eb";

const W = 320;
const H = 150;
const PAD = { top: 10, right: 14, bottom: 22, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function pathFor(curve: { x: number; y: number }[], maxY: number): string {
  return curve
    .map(({ x, y }) => {
      const cx = round2(PAD.left + x * CW);
      const cy = round2(PAD.top + CH - (Math.min(y, maxY) / maxY) * CH);
      return `${cx},${cy}`;
    })
    .join(" ");
}

/**
 * A/B観測ステッパー(Level1の中核可視化, 描画層/Control層)。
 * オンライン実験のようにA/B交互ではない非同期の観測系列を1件ずつコマ送りで反映し、
 * そのたびにA/Bの事後分布(ベータ曲線)とモンテカルロP(B>A)が更新される様子を見せる
 * (K-1のPosteriorUpdateLabと同じ「データが増えるほど分布が痩せていく」ストーリーを2群比較に拡張)。
 */
export function AbObservationStepper() {
  const index = useBayesianApplicationsStore((s) => s.frame.index);
  const count = useBayesianApplicationsStore((s) => s.frame.count);
  const playing = useBayesianApplicationsStore((s) => s.frame.playing);
  const nextFrame = useBayesianApplicationsStore((s) => s.nextFrame);
  const prevFrame = useBayesianApplicationsStore((s) => s.prevFrame);
  const goToFrame = useBayesianApplicationsStore((s) => s.goToFrame);
  const setPlaying = useBayesianApplicationsStore((s) => s.setPlaying);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 900,
  });

  const frames = useMemo(() => buildAbObservationFrames(AB_SEQUENTIAL_STEPS), []);
  const frame = frameAt(frames, index);
  const step: AbSequentialStep = frame?.payload ?? AB_SEQUENTIAL_STEPS[0];

  const curveA = useMemo(() => betaPdfCurve(step.posteriorA), [step.posteriorA]);
  const curveB = useMemo(() => betaPdfCurve(step.posteriorB), [step.posteriorB]);
  const maxY = Math.max(2, ...curveA.map((p) => p.y), ...curveB.map((p) => p.y));

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("stepAA", formatNumber(step.posteriorA.alpha, 0));
    m.setValue("stepBA", formatNumber(step.posteriorA.beta, 0));
    m.setValue("stepAB", formatNumber(step.posteriorB.alpha, 0));
    m.setValue("stepBB", formatNumber(step.posteriorB.beta, 0));
    m.setValue("stepPHat", pct(step.comparison.probBBeatsA, 1));
    const hasData = step.index > 0;
    m.setHighlight("stepAA", hasData && step.observation?.variant === "A", COLOR_A);
    m.setHighlight("stepBA", hasData && step.observation?.variant === "A", COLOR_A);
    m.setHighlight("stepAB", hasData && step.observation?.variant === "B", COLOR_B);
    m.setHighlight("stepBB", hasData && step.observation?.variant === "B", COLOR_B);
    m.setHighlight("stepPHat", true, step.comparison.probBBeatsA >= 0.5 ? COLOR_B : COLOR_A);
  }, [step]);

  return (
    <div id="ab-observation-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        実際のオンライン実験のように、A/B案への訪問が1件ずつ非同期に届く({AB_OBSERVATIONS.length}件の観測系列)。
        コマ送りで1件ずつ反映し、事後分布とP(B&gt;A)がどう動くかを追う。
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="観測を反映するたびに更新されるA/Bの事後分布"
        data-testid="ab-stepper-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline points={pathFor(curveA, maxY)} fill="none" stroke={COLOR_A} strokeWidth={2} data-testid="stepper-curve-a" />
        <polyline points={pathFor(curveB, maxY)} fill="none" stroke={COLOR_B} strokeWidth={2.5} data-testid="stepper-curve-b" />
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={round2(PAD.left + t * CW)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {t}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_A }} />A案(n={step.dataA.visitors})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_B }} />B案(n={step.dataB.visitors})</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
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
        labels={["観測前", ...AB_OBSERVATIONS.map((o, i) => `${i + 1}件目(${o.variant})`)]}
      />
    </div>
  );
}
