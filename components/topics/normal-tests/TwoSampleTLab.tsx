"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { tCurve } from "@/lib/stats/normal-tests";
import { useNormalTestStore } from "@/lib/store/normal-tests";

const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 22, left: 12 };
const XR = 5;

const COLOR_CURVE = "#64748b";
const COLOR_T = "#dc2626"; // 観測 t
const COLOR_TAIL = "#dc2626"; // 棄却域（裾）

// t=Δ/SE と両側 p 値。t・p の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `t=\\dfrac{\\bar x_1-\\bar x_2}{s_p\\sqrt{1/n_1+1/n_2}}=${term(
  "t",
  "t",
)},\\quad p=${term("p", "p")}`;

// 自由度別の両側5%臨界値（近似, df=2n-2 用に補間）。
function tCritical05(df: number): number {
  // df→∞ で1.96。代表値からの粗い補間で十分（棄却域表示用）。
  if (df >= 1000) return 1.962;
  const table: [number, number][] = [
    [1, 12.71],
    [2, 4.303],
    [5, 2.571],
    [10, 2.228],
    [20, 2.086],
    [30, 2.042],
    [60, 2.0],
    [120, 1.98],
  ];
  for (let i = 0; i < table.length - 1; i++) {
    const [d0, v0] = table[i];
    const [d1, v1] = table[i + 1];
    if (df <= d1) return v0 + ((v1 - v0) * (df - d0)) / (d1 - d0);
  }
  return 1.98;
}

export function TwoSampleTLab() {
  const { meanDiff, sd, n } = useNormalTestStore((s) => s.controls);
  const { t, df, se, p } = useNormalTestStore((s) => s.derived);
  const setControl = useNormalTestStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("t", formatNumber(t, 2));
    m.setValue("p", formatNumber(p, 3));
    m.setHighlight("t", true, COLOR_T);
    m.setHighlight("p", true, p < 0.05 ? "#16a34a" : "#dc2626");
  }, [t, p]);

  const tcrit = tCritical05(df);
  const curve = tCurve(df, XR, 120);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yMax = Math.max(...curve.map((c) => c.y), 0.0001) * 1.1;
  const toX = (x: number) => PAD.left + ((x + XR) / (2 * XR)) * plotW;
  const toY = (y: number) => PAD.top + (1 - y / yMax) * plotH;
  const path = curve
    .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c.x).toFixed(1)},${toY(c.y).toFixed(1)}`)
    .join(" ");

  // 棄却域（|x|>tcrit）の塗り。
  const tail = (sign: 1 | -1) => {
    const pts = curve.filter((c) => sign * c.x >= tcrit);
    if (pts.length === 0) return "";
    let d = `M${toX(sign * tcrit).toFixed(1)},${toY(0).toFixed(1)}`;
    for (const c of pts) d += ` L${toX(c.x).toFixed(1)},${toY(c.y).toFixed(1)}`;
    d += ` L${toX(sign * XR).toFixed(1)},${toY(0).toFixed(1)} Z`;
    return d;
  };

  const tClamped = Math.max(-XR, Math.min(XR, t));

  return (
    <div
      id="normaltest-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <Slider
        id="nt-diff"
        label={`平均差 Δ = x̄₁−x̄₂ = ${formatNumber(meanDiff)}`}
        min={0}
        max={4}
        step={0.1}
        value={meanDiff}
        onChange={(v) => setControl("meanDiff", v)}
        accent="accent-blue-600"
      />
      <Slider
        id="nt-sd"
        label={`各群の標準偏差 s = ${formatNumber(sd)}`}
        min={0.5}
        max={5}
        step={0.1}
        value={sd}
        onChange={(v) => setControl("sd", v)}
        accent="accent-slate-600"
      />
      <Slider
        id="nt-n"
        label={`各群の標本サイズ n = ${n}（df=${df}）`}
        min={3}
        max={60}
        step={1}
        value={n}
        onChange={(v) => setControl("n", v)}
        accent="accent-cyan-600"
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="t検定"
        data-testid="ttest-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        {/* 棄却域（両側5%） */}
        <path d={tail(1)} fill={COLOR_TAIL} opacity={0.25} />
        <path d={tail(-1)} fill={COLOR_TAIL} opacity={0.25} />
        <path d={path} fill="none" stroke={COLOR_CURVE} strokeWidth={2} />
        {/* 観測 t */}
        <line
          x1={toX(tClamped)}
          y1={PAD.top}
          x2={toX(tClamped)}
          y2={toY(0)}
          stroke={COLOR_T}
          strokeWidth={2}
        />
        <text
          x={toX(tClamped)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-red-600 text-[10px] font-semibold"
        >
          t={formatNumber(t, 2)}
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm">
        t = {formatNumber(t, 2)}（df={df}）・p = {formatNumber(p, 3)}・SE={formatNumber(se)}{" "}
        <span className={p < 0.05 ? "text-green-700" : "text-red-600"}>
          → {p < 0.05 ? "有意（差あり）" : "有意でない"}
        </span>
      </p>

      <Callout
        title="2標本 t 検定：平均差は «偶然か»"
        body={`平均差 Δ=${formatNumber(meanDiff)} を標準誤差 SE=${formatNumber(
          se,
        )} で割った t=${formatNumber(t, 2)} を、自由度 ${df} の t 分布と比べる。両側 p=${formatNumber(
          p,
          3,
        )}。`}
        note="差を大きく・ばらつきを小さく・n を大きくすると t が大きくなり有意になりやすい。赤い裾（棄却域）に観測 t が入れば «差あり»。"
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
  accent,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  accent: string;
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
        className={`w-full ${accent}`}
        aria-label={label}
      />
    </div>
  );
}
