"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useMultiRegStore } from "@/lib/store/multiple-regression";

const W = 360;
const H = 150;
const PAD = { top: 14, right: 14, bottom: 26, left: 30 };
const Y_MIN = -1.5;
const Y_MAX = 3.5;

const COLOR_B1 = "#2563eb";
const COLOR_B2 = "#7c3aed";
const COLOR_TRUE = "#16a34a";

// VIF=1/(1−ρ²) と正規方程式。VIF の項に id を付け、ρ 操作で差し込み＋ハイライト。
const FORMULA = `\\hat\\beta=(X^\\top X)^{-1}X^\\top y,\\quad \\mathrm{VIF}=\\dfrac{1}{1-\\rho^2}=${term("vif", "?")}`;

export function MulticollinearityLab() {
  const rho = useMultiRegStore((s) => s.controls.rho);
  const { coefficients, standardErrors, rSquared, vif1 } = useMultiRegStore((s) => s.derived);
  const setControl = useMultiRegStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("vif", formatNumber(vif1, 1));
    m.setHighlight("vif", true, vif1 >= 10 ? "#dc2626" : "#2563eb");
  }, [vif1]);

  const b1 = coefficients[1] ?? 0;
  const b2 = coefficients[2] ?? 0;
  const se1 = standardErrors[1] ?? 0;
  const se2 = standardErrors[2] ?? 0;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toY = (v: number) => PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
  const cx1 = PAD.left + plotW * 0.33;
  const cx2 = PAD.left + plotW * 0.67;

  const bar = (cx: number, est: number, se: number, color: string) => {
    const lo = toY(est - 2 * se);
    const hi = toY(est + 2 * se);
    return (
      <g>
        {/* ±2SE のエラーバー */}
        <line x1={cx} y1={hi} x2={cx} y2={lo} stroke={color} strokeWidth={2} />
        <line x1={cx - 8} y1={hi} x2={cx + 8} y2={hi} stroke={color} strokeWidth={2} />
        <line x1={cx - 8} y1={lo} x2={cx + 8} y2={lo} stroke={color} strokeWidth={2} />
        <circle cx={cx} cy={toY(est)} r={4} fill={color} />
      </g>
    );
  };

  return (
    <div
      id="multireg-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-1">
        <label htmlFor="mr-rho" className="text-sm font-semibold text-slate-700">
          2つの説明変数の相関 ρ = {formatNumber(rho)}（真の係数はどちらも β=1）
        </label>
        <input
          id="mr-rho"
          type="range"
          min={0}
          max={0.98}
          step={0.02}
          value={rho}
          onChange={(e) => setControl("rho", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="説明変数の相関 ρ"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="係数推定±2SE"
        data-testid="coef-plot"
      >
        {/* 真値 β=1 の線 */}
        <line
          x1={PAD.left}
          y1={toY(1)}
          x2={W - PAD.right}
          y2={toY(1)}
          stroke={COLOR_TRUE}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD.right}
          y={toY(1) - 2}
          textAnchor="end"
          className="fill-green-700 text-[9px]"
        >
          真値 β=1
        </text>
        {/* 0 の線 */}
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        {bar(cx1, b1, se1, COLOR_B1)}
        {bar(cx2, b2, se2, COLOR_B2)}
        <text
          x={cx1}
          y={H - 8}
          textAnchor="middle"
          className="fill-blue-700 text-[10px] font-semibold"
        >
          β1={formatNumber(b1)}
        </text>
        <text
          x={cx2}
          y={H - 8}
          textAnchor="middle"
          className="fill-violet-700 text-[10px] font-semibold"
        >
          β2={formatNumber(b2)}
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        β1={formatNumber(b1)}±{formatNumber(2 * se1)}・β2={formatNumber(b2)}±{formatNumber(2 * se2)}
        ・VIF={formatNumber(vif1, 1)}・R²={formatNumber(rSquared)}{" "}
        <span className={vif1 >= 10 ? "text-red-600" : "text-slate-500"}>
          {vif1 >= 10 ? "（強い多重共線性）" : ""}
        </span>
      </p>

      <Callout
        title="多重共線性：係数は «不安定» だが当てはまりは良いまま"
        body={`説明変数の相関 ρ=${formatNumber(rho)} を上げると、真の係数は β1=β2=1 のままなのに、推定の «ぶれ»（±2SE のバー）が大きく広がる。VIF=1/(1−ρ²)=${formatNumber(
          vif1,
          1,
        )} がその膨張率。R²=${formatNumber(rSquared)} は高いまま。`}
        note="2変数が似た情報を持つと «どちらの寄与か» を切り分けられず係数が不安定に。予測（R²）は良くても個々の係数の解釈は危うい。VIF>10 が目安。"
        kind="explain"
      />
    </div>
  );
}
