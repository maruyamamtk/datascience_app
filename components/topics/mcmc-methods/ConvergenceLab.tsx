"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { betaPdfCurve } from "@/lib/stats/bayesian-basics";
import { histogram } from "@/lib/stats/histogram";
import { TARGET_BETA, useMcmcMethodsStore } from "@/lib/store/mcmc-methods";
import { num, pct, round2 } from "./format";

const FORMULA = `\\hat R=${term("rhat", "?")}\\qquad \\mathrm{ESS}=${term(
  "ess",
  "?",
)}\\qquad \\text{受理率}=${term("accept", "?")}`;

const HIST_BINS = 20;
const TRACE_W = 340;
const TRACE_H = 100;
const TRACE_PAD = { top: 6, right: 10, bottom: 16, left: 30 };
const TW = TRACE_W - TRACE_PAD.left - TRACE_PAD.right;
const TH = TRACE_H - TRACE_PAD.top - TRACE_PAD.bottom;

const HIST_W = 340;
const HIST_H = 170;
const HIST_PAD = { top: 8, right: 10, bottom: 22, left: 30 };
const HW = HIST_W - HIST_PAD.left - HIST_PAD.right;
const HH = HIST_H - HIST_PAD.top - HIST_PAD.bottom;

const COLOR_TRACE = "#2563eb";
const COLOR_TARGET = "#94a3b8";
const COLOR_HIST = "#93c5fd";

/**
 * MCMC収束診断ラボ(Level2, 描画層/Control層)。
 * 提案分布の標準偏差σ(Level0のMHStepperと同じcontrols.proposalSdを共有)を動かすと、
 * 長いチェーン(400ステップ、バーンイン50除去)のトレースプロット・ヒストグラム・
 * 分割R-hat・有効サンプルサイズ・受理率が即座に追従する
 * ——「同じ知識(σ)が、1ステップずつの見た目と集約された診断指標の両方にどう効くか」を対比できる。
 */
export function ConvergenceLab() {
  const proposalSd = useMcmcMethodsStore((s) => s.controls.proposalSd);
  const setControl = useMcmcMethodsStore((s) => s.setControl);
  const samples = useMcmcMethodsStore((s) => s.derived.mhLongSamplesBurned);
  const acceptanceRate = useMcmcMethodsStore((s) => s.derived.acceptanceRate);
  const rHat = useMcmcMethodsStore((s) => s.derived.rHat);
  const ess = useMcmcMethodsStore((s) => s.derived.ess);

  const curve = useMemo(() => betaPdfCurve(TARGET_BETA), []);
  const bins = useMemo(() => histogram(samples, { min: 0, max: 1, bins: HIST_BINS }), [samples]);
  const binWidth = 1 / HIST_BINS;
  const histDensity = bins.map((b) => (samples.length > 0 ? b.count / (samples.length * binWidth) : 0));
  const maxDensity = Math.max(2, ...curve.map((p) => p.y), ...histDensity);

  const traceMin = 0;
  const traceMax = 1;
  const tracePoints = samples
    .map((v, i) => {
      const x = round2(TRACE_PAD.left + (i / Math.max(1, samples.length - 1)) * TW);
      const y = round2(TRACE_PAD.top + TH - ((v - traceMin) / (traceMax - traceMin)) * TH);
      return `${x},${y}`;
    })
    .join(" ");

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("rhat", formatNumber(rHat, 3));
    m.setValue("ess", formatNumber(ess, 0));
    m.setValue("accept", `${formatNumber(acceptanceRate * 100, 0)}\\%`);
    const rhatGood = rHat < 1.05;
    m.setHighlight("rhat", true, rhatGood ? "#16a34a" : "#dc2626");
  }, [rHat, ess, acceptanceRate]);

  return (
    <div id="mcmc-convergence-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        同じ提案分布の幅 σ を、400ステップ(先頭50をバーンインとして除去)の長いチェーンに適用する。
        σ が小さすぎる/大きすぎるとどう変わるか、トレースプロット・ヒストグラム・診断指標で確認しよう。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        提案分布の標準偏差 σ = {num(proposalSd, 2)}
        <input
          type="range"
          min={0.02}
          max={2}
          step={0.02}
          value={proposalSd}
          onChange={(e) => setControl("proposalSd", Number(e.target.value))}
          aria-label="収束診断ラボの提案分布標準偏差"
          data-testid="conv-proposal-sd-slider"
          className="accent-blue-600"
        />
      </label>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">トレースプロット(θの推移)</p>
        <svg
          viewBox={`0 0 ${TRACE_W} ${TRACE_H}`}
          className="mx-auto h-auto w-full max-w-md"
          role="img"
          aria-label="MCMCチェーンのトレースプロット"
          data-testid="conv-trace-svg"
        >
          <line
            x1={TRACE_PAD.left}
            y1={TRACE_PAD.top + TH}
            x2={TRACE_W - TRACE_PAD.right}
            y2={TRACE_PAD.top + TH}
            stroke="#e2e8f0"
          />
          <line x1={TRACE_PAD.left} y1={TRACE_PAD.top} x2={TRACE_PAD.left} y2={TRACE_PAD.top + TH} stroke="#e2e8f0" />
          <polyline points={tracePoints} fill="none" stroke={COLOR_TRACE} strokeWidth={1} data-testid="conv-trace-line" />
        </svg>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">サンプルのヒストグラム vs 目標分布 Beta(6,6)</p>
        <svg
          viewBox={`0 0 ${HIST_W} ${HIST_H}`}
          className="mx-auto h-auto w-full max-w-md"
          role="img"
          aria-label="MCMCサンプルのヒストグラムと目標分布の比較"
          data-testid="conv-hist-svg"
        >
          <line
            x1={HIST_PAD.left}
            y1={HIST_PAD.top + HH}
            x2={HIST_W - HIST_PAD.right}
            y2={HIST_PAD.top + HH}
            stroke="#cbd5e1"
          />
          {bins.map((b, i) => {
            const barH = (Math.min(histDensity[i], maxDensity) / maxDensity) * HH;
            return (
              <rect
                key={i}
                x={round2(HIST_PAD.left + (b.x0) * HW) + 1}
                y={round2(HIST_PAD.top + HH - barH)}
                width={round2(HW / HIST_BINS - 2)}
                height={round2(barH)}
                fill={COLOR_HIST}
                data-testid={`conv-hist-bin-${i}`}
              />
            );
          })}
          <polyline
            points={curve
              .map(
                (p) =>
                  `${round2(HIST_PAD.left + p.x * HW)},${round2(
                    HIST_PAD.top + HH - (Math.min(p.y, maxDensity) / maxDensity) * HH,
                  )}`,
              )
              .join(" ")}
            fill="none"
            stroke={COLOR_TARGET}
            strokeWidth={2}
            data-testid="conv-target-curve"
          />
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="font-semibold text-slate-700">受理率</div>
          <div className="mt-1 text-slate-900" data-testid="conv-acceptance">
            {pct(acceptanceRate)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="font-semibold text-slate-700">分割R-hat</div>
          <div className="mt-1 text-slate-900" data-testid="conv-rhat">
            {num(rHat, 3)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="font-semibold text-slate-700">有効サンプルサイズ</div>
          <div className="mt-1 text-slate-900" data-testid="conv-ess">
            {num(ess, 0)} / {samples.length}
          </div>
        </div>
      </div>
    </div>
  );
}
