"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { DISCRETE_SPECS, type DiscreteKind } from "@/lib/stats/discrete";
import { useDiscreteStore } from "@/lib/store/discrete-distributions";

const W = 360;
const H = 130;
const PAD = { top: 10, right: 12, bottom: 22, left: 28 };

const COLOR_BAR = "#2563eb";
const COLOR_MEAN = "#7c3aed";

// E[X]=μ、Var[X]=σ²。値の項に id を付け操作で差し込み＋ハイライト。
const FORMULA = `E[X]=${term("meanv", "\\mu")},\\quad \\mathrm{Var}[X]=${term("varv", "\\sigma^2")}`;

const ORDER: DiscreteKind[] = [
  "uniform",
  "bernoulli",
  "binomial",
  "poisson",
  "geometric",
  "negativeBinomial",
];

// 種別ごとに表示するパラメータ。
const PARAMS_FOR: Record<DiscreteKind, ("n" | "p" | "lambda" | "r")[]> = {
  uniform: ["n"],
  bernoulli: ["p"],
  binomial: ["n", "p"],
  poisson: ["lambda"],
  geometric: ["p"],
  negativeBinomial: ["r", "p"],
};

export function DiscreteExplorer() {
  const kind = useDiscreteStore((s) => s.controls.kind);
  const { n, p, lambda, r } = useDiscreteStore((s) => s.controls);
  const { pmf, mean, variance, paramText } = useDiscreteStore((s) => s.derived);
  const setControl = useDiscreteStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("meanv", formatNumber(mean));
    c.setValue("varv", formatNumber(variance));
    c.setHighlight("meanv", true, COLOR_MEAN);
    c.setHighlight("varv", true, COLOR_BAR);
  }, [mean, variance]);

  const cells = pmf.length;
  const plotW = W - PAD.left - PAD.right;
  const bandW = plotW / cells;
  const pmfMax = Math.max(...pmf, 0.0001);
  const toX = (k: number) => PAD.left + k * bandW;
  const meanX = PAD.left + Math.min(cells, mean) * bandW + bandW / 2;

  const shown = PARAMS_FOR[kind];

  return (
    <div
      id="discrete-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      {/* 族セレクタ */}
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
            {DISCRETE_SPECS[k].label}
          </button>
        ))}
      </div>

      {/* パラメータ（種別に応じて表示） */}
      <div className="space-y-3">
        {shown.includes("n") && (
          <Slider
            id="de-n"
            label={`n = ${n}`}
            min={2}
            max={20}
            step={1}
            value={n}
            onChange={(v) => setControl("n", v)}
          />
        )}
        {shown.includes("p") && (
          <Slider
            id="de-p"
            label={`p = ${formatNumber(p)}`}
            min={0.05}
            max={0.95}
            step={0.05}
            value={p}
            onChange={(v) => setControl("p", v)}
          />
        )}
        {shown.includes("lambda") && (
          <Slider
            id="de-lambda"
            label={`λ = ${formatNumber(lambda)}`}
            min={0.5}
            max={12}
            step={0.5}
            value={lambda}
            onChange={(v) => setControl("lambda", v)}
          />
        )}
        {shown.includes("r") && (
          <Slider
            id="de-r"
            label={`r = ${r}`}
            min={1}
            max={8}
            step={1}
            value={r}
            onChange={(v) => setControl("r", v)}
          />
        )}
      </div>

      <p className="text-center text-sm font-semibold text-slate-700">{paramText}</p>

      {/* PMF 棒グラフ */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="確率関数"
        data-testid="discrete-pmf"
      >
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
        />
        {pmf.map((pk, k) => {
          const h = (pk / pmfMax) * (H - PAD.top - PAD.bottom);
          return (
            <rect
              key={k}
              x={toX(k) + bandW * 0.12}
              y={H - PAD.bottom - h}
              width={Math.max(1, bandW * 0.76)}
              height={h}
              fill={COLOR_BAR}
            />
          );
        })}
        {/* 平均の位置 */}
        <line
          x1={meanX}
          y1={PAD.top}
          x2={meanX}
          y2={H - PAD.bottom}
          stroke={COLOR_MEAN}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        {[0, Math.floor((cells - 1) / 2), cells - 1].map((k) => (
          <text
            key={k}
            x={toX(k) + bandW / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[9px]"
          >
            {k}
          </text>
        ))}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        μ = {formatNumber(mean)}・σ² = {formatNumber(variance)}
      </p>

      <Callout
        title="離散分布は «何を数えるか» で選ぶ"
        body="二項＝n回中の成功数、ポアソン＝一定時間の稀な事象の回数、幾何＝初成功までの失敗数、負の二項＝r回成功までの失敗数。離散一様＝どれも等確率。"
        note="ポアソンは平均=分散（λ）が特徴。幾何・負の二項は «待ち時間» 系で右に裾を引く。"
        kind="explain"
      />
    </div>
  );
}

function Slider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
        aria-label={label}
      />
    </div>
  );
}
