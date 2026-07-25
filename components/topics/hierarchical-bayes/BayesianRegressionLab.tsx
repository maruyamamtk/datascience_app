"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { term } from "@/components/math/tex";
import { predictCentered } from "@/lib/stats/hierarchical-bayes";
import {
  DEFAULT_REGRESSION_DATA,
  PRIOR_VAR_SLOPE_MAX,
  PRIOR_VAR_SLOPE_MIN,
  useHierarchicalBayesStore,
} from "@/lib/store/hierarchical-bayes";
import { num, round2 } from "./format";

const FORMULA = `\\hat\\beta_{Bayes}=(1-${term("B", "?")})\\times${term("betaOls", "?")}=${term("betaBayes", "?")}`;

const COLOR_OLS = "#94a3b8";
const COLOR_BAYES = "#2563eb";
const COLOR_POINT = "#334155";

const W = 340;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 26, left: 34 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

const xValues = DEFAULT_REGRESSION_DATA.map((p) => p.x);
const yValues = DEFAULT_REGRESSION_DATA.map((p) => p.y);
const xMin = Math.min(...xValues) - 1;
const xMax = Math.max(...xValues) + 1;

/**
 * ベイズ線形回帰ラボ(Level1の中核可視化, 描画層/Control層)。
 * n=8の小標本・ノイズ大きめの回帰データに、傾きβ1に正規事前分布N(0,τ_β²)を置いた
 * ベイズ線形回帰を当てはめる。τ_β²(事前分散)スライダーを動かすと、
 * 傾きの事後平均(青の直線)がOLS(灰の破線)と水平線(事前平均0)の間でどう縮小するかを見せる
 * ——階層ベイズと全く同じ「precisionWeightedMean」の式が、ここでは回帰係数に対して働く。
 */
export function BayesianRegressionLab() {
  const priorVarSlope = useHierarchicalBayesStore((s) => s.controls.priorVarSlope);
  const regression = useHierarchicalBayesStore((s) => s.derived.regression);
  const setControl = useHierarchicalBayesStore((s) => s.setControl);

  const xBar = xValues.reduce((a, b) => a + b, 0) / xValues.length;
  const olsLine = [xMin, xMax].map((x) => ({
    x,
    y: predictCentered(x, xBar, regression.interceptOls, regression.slopeOls),
  }));
  const bayesLine = [xMin, xMax].map((x) => ({
    x,
    y: predictCentered(x, xBar, regression.interceptPosterior, regression.slopePosterior),
  }));

  const yAll = [...yValues, ...olsLine.map((p) => p.y), ...bayesLine.map((p) => p.y)];
  const yMin = Math.min(...yAll) - 5;
  const yMax = Math.max(...yAll) + 5;

  const toCx = (v: number) => round2(PAD.left + ((v - xMin) / (xMax - xMin)) * CW);
  const toCy = (v: number) => round2(PAD.top + CH - ((v - yMin) / (yMax - yMin)) * CH);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("B", num(regression.slopeWeight, 2));
    m.setValue("betaOls", num(regression.slopeOls, 2));
    m.setValue("betaBayes", num(regression.slopePosterior, 2));
    m.setHighlight("betaBayes", true, COLOR_BAYES);
  }, [regression]);

  return (
    <div id="bayesian-regression-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        n=8点・ノイズが大きめの小標本データ。灰の破線が最小二乗(OLS)、青の直線が傾きβ1に
        正規事前分布N(0, τ<sub>β</sub>²)を置いたベイズ線形回帰の事後平均。
        τ<sub>β</sub>²を小さくする(=強い正則化)ほど、傾きが0(水平)に向けて縮小される。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        傾きの事前分散 τ<sub>β</sub>² = {num(priorVarSlope, 1)}
        <input
          type="range"
          min={PRIOR_VAR_SLOPE_MIN}
          max={PRIOR_VAR_SLOPE_MAX}
          step={0.5}
          value={priorVarSlope}
          onChange={(e) => setControl("priorVarSlope", Number(e.target.value))}
          aria-label="傾きの事前分散tauBeta2"
          data-testid="prior-var-slope-slider"
          className="accent-blue-600"
        />
        <span className="text-xs text-slate-400">
          小さいτ<sub>β</sub>²＝Ridge回帰の正則化を強めるのと同じ効果(λ=σ²/τ<sub>β</sub>²が大きくなる)
        </span>
      </label>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="OLSとベイズ線形回帰の回帰直線の比較"
        data-testid="regression-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline
          points={olsLine.map((p) => `${toCx(p.x)},${toCy(p.y)}`).join(" ")}
          fill="none"
          stroke={COLOR_OLS}
          strokeWidth={2}
          strokeDasharray="5 3"
          data-testid="ols-line"
        />
        <polyline
          points={bayesLine.map((p) => `${toCx(p.x)},${toCy(p.y)}`).join(" ")}
          fill="none"
          stroke={COLOR_BAYES}
          strokeWidth={2.5}
          data-testid="bayes-line"
        />
        {DEFAULT_REGRESSION_DATA.map((p, i) => (
          <circle key={i} cx={toCx(p.x)} cy={toCy(p.y)} r={3.5} fill={COLOR_POINT} data-testid={`data-point-${i}`} />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_OLS }} />OLS(縮小なし)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full" style={{ background: COLOR_BAYES }} />ベイズ事後平均(縮小あり)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_POINT }} />観測データ</span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>
    </div>
  );
}
