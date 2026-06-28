"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { SAMPLING_SPECS, type SamplingKind } from "@/lib/stats/sampling-distributions";
import { useSamplingStore } from "@/lib/store/sampling-distributions";

const W = 360;
const H = 150;
const PAD = { top: 12, right: 14, bottom: 22, left: 14 };
const COLOR_CURVE = "#2563eb";
const COLOR_MEAN = "#7c3aed";

const FORMULA = `E[X]=${term("meanv", "\\mu")},\\quad \\mathrm{Var}[X]=${term("varv", "\\sigma^2")}`;

const ORDER: SamplingKind[] = ["t", "chiSquare", "f"];
const NOTES: Record<SamplingKind, string> = {
  t: "正規母集団で σ を s で置き換えた (x̄−μ)/(s/√n) が従う。自由度 n−1。",
  chiSquare: "正規標本の «二乗和»（標本分散）が従う。適合度検定・分散の検定に。",
  f: "2 つの分散（カイ二乗/自由度）の比。分散分析・等分散検定に。",
};

export function SamplingExplorer() {
  const kind = useSamplingStore((s) => s.controls.kind);
  const { df1, df2 } = useSamplingStore((s) => s.controls);
  const { curve, mean, variance, paramText } = useSamplingStore((s) => s.derived);
  const setControl = useSamplingStore((s) => s.setControl);

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
  const hasMean = Number.isFinite(mean);

  return (
    <div
      id="sampling-operation"
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
            {SAMPLING_SPECS[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="se-df1" className="text-sm font-semibold text-slate-700">
            {kind === "f" ? "第1自由度 d₁" : "自由度 ν"} = {df1}
          </label>
          <input
            id="se-df1"
            type="range"
            min={1}
            max={30}
            step={1}
            value={df1}
            onChange={(e) => setControl("df1", Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label="自由度1"
          />
        </div>
        {kind === "f" && (
          <div className="space-y-1">
            <label htmlFor="se-df2" className="text-sm font-semibold text-slate-700">
              第2自由度 d₂ = {df2}
            </label>
            <input
              id="se-df2"
              type="range"
              min={1}
              max={30}
              step={1}
              value={df2}
              onChange={(e) => setControl("df2", Number(e.target.value))}
              className="w-full accent-blue-600"
              aria-label="自由度2"
            />
          </div>
        )}
      </div>

      <p className="text-center text-sm font-semibold text-slate-700">{paramText}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="標本分布の密度"
        data-testid="sampling-pdf"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
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
      </p>

      <Callout
        title={SAMPLING_SPECS[kind].label}
        body={NOTES[kind]}
        note="いずれも «正規母集団から標本を取ったときの統計量» の分布。検定統計量がこれらに従う。"
        kind="explain"
      />
    </div>
  );
}
