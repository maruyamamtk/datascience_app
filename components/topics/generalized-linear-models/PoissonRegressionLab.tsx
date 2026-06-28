"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { poissonMean } from "@/lib/stats/glm";
import { COUNT_DATA, useGlmStore } from "@/lib/store/generalized-linear-models";

const W = 360;
const H = 190;
const PAD = { top: 14, right: 14, bottom: 26, left: 30 };
const X_MIN = 0;
const X_MAX = 4;

const COLOR_CURVE = "#2563eb";
const COLOR_PT = "#0f766e";

// λ=exp(b0+b1x), デビアンス D。D の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\lambda=e^{${term("b0", "b_0")}+${term("b1", "b_1")}x},\\quad D=${term("dev", "?")}`;

export function PoissonRegressionLab() {
  const { b0, b1 } = useGlmStore((s) => s.controls);
  const { logLik, deviance } = useGlmStore((s) => s.derived);
  const setControl = useGlmStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("b0", formatNumber(b0));
    m.setValue("b1", formatNumber(b1));
    m.setValue("dev", formatNumber(deviance, 1));
    m.setHighlight("b0", true, COLOR_CURVE);
    m.setHighlight("b1", true, COLOR_CURVE);
    m.setHighlight("dev", true, "#dc2626");
  }, [b0, b1, deviance]);

  const yMax = Math.max(...COUNT_DATA.y, 5) * 1.15;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toY = (v: number) => PAD.top + (1 - v / yMax) * plotH;

  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i === 0 ? "M" : "L"}${toX(x).toFixed(1)},${toY(poissonMean(x, b0, b1)).toFixed(1)}`;
  }).join(" ");

  return (
    <div id="glm-operation" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        カウントデータ（件数）に指数の平均曲線 λ=exp(b0+b1x) を当てはめる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ポアソン回帰"
        data-testid="poisson-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        {COUNT_DATA.x.map((xi, i) => (
          <circle
            key={i}
            cx={toX(xi)}
            cy={toY(COUNT_DATA.y[i])}
            r={3}
            fill={COLOR_PT}
            opacity={0.55}
          />
        ))}
        <path d={curve} fill="none" stroke={COLOR_CURVE} strokeWidth={2.5} />
        <text
          x={PAD.left - 4}
          y={toY(0) + 3}
          textAnchor="end"
          className="fill-slate-400 text-[8px]"
        >
          0
        </text>
      </svg>

      <Slider
        id="gl-b0"
        label={`切片 b0 = ${formatNumber(b0)}`}
        min={-1}
        max={2}
        step={0.05}
        value={b0}
        onChange={(v) => setControl("b0", v)}
      />
      <Slider
        id="gl-b1"
        label={`傾き b1 = ${formatNumber(b1)}（対数リンクの係数）`}
        min={-0.5}
        max={1.5}
        step={0.05}
        value={b1}
        onChange={(v) => setControl("b1", v)}
      />

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        デビアンス D={formatNumber(deviance, 1)}（小さいほど良い）・対数尤度=
        {formatNumber(logLik, 1)}
      </p>

      <Callout
        title="ポアソン回帰：件数データを «対数リンク» で回帰"
        body={`カウント（0,1,2,…）の平均 λ を exp(b0+b1x) でモデル化。対数リンク log λ=b0+b1x が線形。指数なので λ は必ず正。デビアンス D=${formatNumber(
          deviance,
          1,
        )}（残差平方和の一般化）を最小にする係数が最尤。`}
        note="直線回帰（連続）・ロジスティック（2値）・ポアソン（件数）は «線形予測子＋リンク関数» で統一できる＝一般化線形モデル。応答の型でリンクを選ぶ。"
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
