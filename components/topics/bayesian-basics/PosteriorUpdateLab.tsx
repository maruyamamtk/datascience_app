"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, StepPlayer, useFramePlayer } from "@/components/viz";
import { betaPdfCurve, COIN_SEQUENCE, type UpdateStep } from "@/lib/stats/bayesian-basics";
import { useBayesianBasicsStore } from "@/lib/store/bayesian-basics";
import { buildPosteriorFrames } from "./frames";
import { num, round2 } from "./format";

const FORMULA = `\\text{Beta}(\\alpha_0+k,\\ \\beta_0+m)=\\text{Beta}(${term(
  "alpha0",
  "?",
)}+${term("k", "?")},\\ ${term("beta0", "?")}+${term("m", "?")})=\\text{Beta}(${term(
  "alphaPost",
  "?",
)},\\ ${term("betaPost", "?")})`;

const COLOR_PRIOR = "#94a3b8";
const COLOR_POSTERIOR = "#2563eb";

const W = 320;
const H = 170;
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
 * 事後分布更新ステッパー(Level0の中核可視化, 描画層/Control層)。
 * コイン投げを1回ずつ観測するたびに、ベータ事前分布→事後分布が更新されていく様子を
 * コマ送り(StepPlayer)で見せる。事前分布のα・βは操作でき、同じ観測列に対して
 * 異なる事前分布からどう更新が変わるかを比較できる(操作→図→数式の強連動)。
 */
export function PosteriorUpdateLab() {
  const priorAlpha = useBayesianBasicsStore((s) => s.controls.priorAlpha);
  const priorBeta = useBayesianBasicsStore((s) => s.controls.priorBeta);
  const updateSteps = useBayesianBasicsStore((s) => s.derived.updateSteps);
  const setControl = useBayesianBasicsStore((s) => s.setControl);

  const index = useBayesianBasicsStore((s) => s.frame.index);
  const count = useBayesianBasicsStore((s) => s.frame.count);
  const playing = useBayesianBasicsStore((s) => s.frame.playing);
  const nextFrame = useBayesianBasicsStore((s) => s.nextFrame);
  const prevFrame = useBayesianBasicsStore((s) => s.prevFrame);
  const goToFrame = useBayesianBasicsStore((s) => s.goToFrame);
  const setPlaying = useBayesianBasicsStore((s) => s.setPlaying);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1200,
  });

  const frames = useMemo(
    () => buildPosteriorFrames(updateSteps, priorAlpha, priorBeta),
    [updateSteps, priorAlpha, priorBeta],
  );
  const frame = frameAt(frames, index);
  const step: UpdateStep = frame?.payload ?? updateSteps[0];

  const priorCurve = useMemo(
    () => betaPdfCurve({ alpha: priorAlpha, beta: priorBeta }),
    [priorAlpha, priorBeta],
  );
  const posteriorCurve = useMemo(() => betaPdfCurve(step.posterior), [step.posterior]);
  const maxY = Math.max(
    2,
    ...priorCurve.map((p) => p.y),
    ...posteriorCurve.map((p) => p.y),
  );

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("alpha0", String(priorAlpha));
    m.setValue("beta0", String(priorBeta));
    m.setValue("k", String(step.successesSoFar));
    m.setValue("m", String(step.failuresSoFar));
    m.setValue("alphaPost", formatNumber(step.posterior.alpha, 0));
    m.setValue("betaPost", formatNumber(step.posterior.beta, 0));
    const hasData = step.index > 0;
    m.setHighlight("k", hasData, COLOR_POSTERIOR);
    m.setHighlight("m", hasData, COLOR_POSTERIOR);
    m.setHighlight("alphaPost", true, COLOR_POSTERIOR);
    m.setHighlight("betaPost", true, COLOR_POSTERIOR);
  }, [priorAlpha, priorBeta, step]);

  return (
    <div id="posterior-update-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        コインを1枚ずつ投げ、表(1)/裏(0)を観測するたびに「表が出る確率θ」の事後分布を更新する。
        灰色の曲線が事前分布(観測前の信念)、青の曲線が現在までの観測を反映した事後分布。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          事前分布 α<sub>0</sub> = {num(priorAlpha, 1)}
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={priorAlpha}
            onChange={(e) => setControl("priorAlpha", Number(e.target.value))}
            aria-label="事前分布のalpha"
            data-testid="prior-alpha-slider"
            className="accent-blue-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          事前分布 β<sub>0</sub> = {num(priorBeta, 1)}
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={priorBeta}
            onChange={(e) => setControl("priorBeta", Number(e.target.value))}
            aria-label="事前分布のbeta"
            data-testid="prior-beta-slider"
            className="accent-blue-600"
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-center gap-1" role="img" aria-label="コイン投げの観測系列">
        {COIN_SEQUENCE.map((v, i) => {
          const revealed = i < step.index;
          return (
            <span
              key={i}
              data-testid={`coin-${i}`}
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                revealed
                  ? v === 1
                    ? "border-blue-600 bg-blue-100 text-blue-700"
                    : "border-slate-400 bg-slate-100 text-slate-600"
                  : "border-dashed border-slate-200 bg-white text-slate-300"
              }`}
            >
              {revealed ? (v === 1 ? "表" : "裏") : "?"}
            </span>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="事前分布と事後分布のベータ曲線"
        data-testid="posterior-curve-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline
          points={pathFor(priorCurve, maxY)}
          fill="none"
          stroke={COLOR_PRIOR}
          strokeWidth={2}
          strokeDasharray="4 3"
          data-testid="prior-curve"
        />
        <polyline
          points={pathFor(posteriorCurve, maxY)}
          fill="none"
          stroke={COLOR_POSTERIOR}
          strokeWidth={2.5}
          data-testid="posterior-curve"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text
            key={t}
            x={round2(PAD.left + t * CW)}
            y={PAD.top + CH + 14}
            textAnchor="middle"
            className="fill-slate-500 text-[9px]"
          >
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-slate-400 text-[9px]">
          θ(表が出る確率)
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_PRIOR }} />事前分布</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_POSTERIOR }} />事後分布(現在)</span>
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
        labels={["観測前", ...COIN_SEQUENCE.map((_, i) => `${i + 1}投目`)]}
      />
    </div>
  );
}
