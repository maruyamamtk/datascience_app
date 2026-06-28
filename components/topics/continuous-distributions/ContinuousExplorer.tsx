"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CONTINUOUS_SPECS, type ContinuousKind } from "@/lib/stats/continuous";
import { useContinuousStore } from "@/lib/store/continuous-distributions";

const W = 360;
const H = 150;
const PAD = { top: 12, right: 14, bottom: 22, left: 14 };

const COLOR_CURVE = "#2563eb";
const COLOR_MEAN = "#7c3aed";

const FORMULA = `E[X]=${term("meanv", "\\mu")},\\quad \\mathrm{Var}[X]=${term("varv", "\\sigma^2")}`;

const ORDER: ContinuousKind[] = [
  "uniform",
  "exponential",
  "gamma",
  "beta",
  "lognormal",
  "halfNormal",
  "cauchy",
];

// 種別ごとに表示するパラメータ（ラベル, controls キー, min, max, step）。
type P = {
  key: "lambda" | "k" | "theta" | "mu" | "sigma";
  label: string;
  min: number;
  max: number;
  step: number;
};
const PARAMS_FOR: Record<ContinuousKind, P[]> = {
  uniform: [],
  exponential: [{ key: "lambda", label: "率 λ", min: 0.3, max: 3, step: 0.1 }],
  gamma: [
    { key: "k", label: "形状 k", min: 0.5, max: 8, step: 0.5 },
    { key: "theta", label: "尺度 θ", min: 0.3, max: 3, step: 0.1 },
  ],
  beta: [
    { key: "k", label: "α", min: 0.5, max: 6, step: 0.5 },
    { key: "theta", label: "β", min: 0.5, max: 6, step: 0.5 },
  ],
  lognormal: [
    { key: "mu", label: "μ(logの平均)", min: -1, max: 1.5, step: 0.1 },
    { key: "sigma", label: "σ(logの偏差)", min: 0.2, max: 1.2, step: 0.1 },
  ],
  halfNormal: [{ key: "sigma", label: "σ", min: 0.3, max: 3, step: 0.1 }],
  cauchy: [
    { key: "mu", label: "位置 x₀", min: -3, max: 3, step: 0.5 },
    { key: "sigma", label: "尺度 γ", min: 0.3, max: 3, step: 0.1 },
  ],
};

export function ContinuousExplorer() {
  const kind = useContinuousStore((s) => s.controls.kind);
  const controls = useContinuousStore((s) => s.controls);
  const { curve, mean, variance, paramText } = useContinuousStore((s) => s.derived);
  const setControl = useContinuousStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("meanv", formatNumber(mean));
    c.setValue("varv", formatNumber(variance));
    c.setHighlight("meanv", true, COLOR_MEAN);
    c.setHighlight("varv", true, COLOR_CURVE);
  }, [mean, variance]);

  const xs = curve.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...curve.map((p) => p.y), 0.0001);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (y: number) => PAD.top + (1 - Math.min(1, y / yMax)) * plotH;

  const path = curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${toX(xMax).toFixed(1)},${toY(0).toFixed(1)} L${toX(xMin).toFixed(1)},${toY(0).toFixed(1)} Z`;

  const params = PARAMS_FOR[kind];
  const hasMean = Number.isFinite(mean);

  return (
    <div
      id="continuous-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap gap-2">
        {ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setControl("kind", k)}
            aria-pressed={kind === k}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              kind === k
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {CONTINUOUS_SPECS[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {params.length === 0 && (
          <p className="text-sm text-slate-500">この分布は固定パラメータ（U[0,4]）で表示します。</p>
        )}
        {params.map((pp) => (
          <div key={pp.key} className="space-y-1">
            <label htmlFor={`ce-${pp.key}`} className="text-sm font-semibold text-slate-700">
              {pp.label} = {formatNumber(controls[pp.key])}
            </label>
            <input
              id={`ce-${pp.key}`}
              type="range"
              min={pp.min}
              max={pp.max}
              step={pp.step}
              value={controls[pp.key]}
              onChange={(e) => setControl(pp.key, Number(e.target.value))}
              className="w-full accent-blue-600"
              aria-label={pp.label}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-semibold text-slate-700">{paramText}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="確率密度関数"
        data-testid="continuous-pdf"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path d={area} fill={COLOR_CURVE} opacity={0.1} />
        <path d={path} fill="none" stroke={COLOR_CURVE} strokeWidth={2.5} />
        {hasMean && mean >= xMin && mean <= xMax && (
          <line
            x1={toX(mean)}
            y1={PAD.top}
            x2={toX(mean)}
            y2={toY(0)}
            stroke={COLOR_MEAN}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        )}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        μ = {formatNumber(mean)}・σ² = {formatNumber(variance)}
        {!hasMean && (
          <span className="ml-2 text-red-600">（コーシーは平均・分散が存在しない）</span>
        )}
      </p>

      <Callout
        title="連続分布は «待ち時間・割合・裾の重さ» で選ぶ"
        body="指数＝無記憶な待ち時間、ガンマ＝指数の和（待ち時間の累積）、ベータ＝0〜1の割合、対数正規＝掛け算的な量（所得・株価）、半正規＝正規の絶対値。"
        note="コーシーは裾が極端に重く、平均すら定義できない（外れ値が常に効く）。分布選びは «裾の重さ» が肝。"
        kind="explain"
      />
    </div>
  );
}
