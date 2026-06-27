"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { normalPdf } from "@/lib/stats/normal";
import { linearTransformNormalPdf } from "@/lib/stats/transform";
import { useTransformStore } from "@/lib/store/variable-transformation";

const W = 360;
const H = 170;
const PAD = { top: 12, right: 14, bottom: 24, left: 14 };
const AXIS_MIN = -8;
const AXIS_MAX = 12;
const SAMPLES = 120;

const COLOR_X = "#94a3b8"; // 元 X
const COLOR_Y = "#2563eb"; // 変換後 Y
const COLOR_A = "#dc2626"; // 倍率 a
const COLOR_B = "#7c3aed"; // 平行移動 b

// E[aX+b]=aμ+b、Var[aX+b]=a²σ²。値の項に id を付け操作で差し込み＋ハイライト。
const FORMULA = `E[${term("a1", "a")}X+${term("b1", "b")}]=${term("muY", "\\mu_Y")},\\quad \\mathrm{Var}[${term(
  "a2",
  "a",
)}X+b]=${term("a3", "a")}^2\\sigma_X^2=${term("varY", "\\sigma_Y^2")}`;

export function TransformLab() {
  const { muX, sigmaX, a, b } = useTransformStore((s) => s.controls);
  const { muY, varY, sigmaY, jacobian } = useTransformStore((s) => s.derived);
  const setControl = useTransformStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("a1", formatNumber(a));
    c.setValue("a2", formatNumber(a));
    c.setValue("a3", formatNumber(a));
    c.setValue("b1", formatNumber(b));
    c.setValue("muY", formatNumber(muY));
    c.setValue("varY", formatNumber(varY));
    c.setHighlight("a1", true, COLOR_A);
    c.setHighlight("a2", true, COLOR_A);
    c.setHighlight("a3", true, COLOR_A);
    c.setHighlight("b1", true, COLOR_B);
    c.setHighlight("muY", true, COLOR_Y);
    c.setHighlight("varY", true, COLOR_Y);
  }, [a, b, muY, varY]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (v: number) => PAD.left + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * plotW;
  // 縦スケールは元 N(μ,σ) のピーク（0.4/σ 付近）に合わせ、両曲線を同尺度で比較。
  const yMax = 0.45 / Math.max(0.4, Math.min(sigmaX, sigmaY));
  const toY = (d: number) => PAD.top + (1 - Math.min(1, d / yMax)) * plotH;

  const path = (f: (v: number) => number) => {
    let s = "";
    for (let i = 0; i <= SAMPLES; i++) {
      const v = AXIS_MIN + (i / SAMPLES) * (AXIS_MAX - AXIS_MIN);
      s += `${i === 0 ? "M" : "L"}${toX(v).toFixed(1)},${toY(f(v)).toFixed(1)} `;
    }
    return s;
  };

  return (
    <div
      id="transform-operation"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <Slider
        id="tl-a"
        label={`倍率 a = ${formatNumber(a)}（縦に伸縮・符号で反転）`}
        min={-3}
        max={3}
        step={0.1}
        value={a}
        onChange={(v) => setControl("a", v)}
        accent="accent-red-600"
      />
      <Slider
        id="tl-b"
        label={`平行移動 b = ${formatNumber(b)}`}
        min={-5}
        max={5}
        step={0.5}
        value={b}
        onChange={(v) => setControl("b", v)}
        accent="accent-violet-600"
      />
      <Slider
        id="tl-sigma"
        label={`元の σ_X = ${formatNumber(sigmaX)}`}
        min={0.5}
        max={3}
        step={0.1}
        value={sigmaX}
        onChange={(v) => setControl("sigmaX", v)}
        accent="accent-slate-600"
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="変数変換による密度の変化"
        data-testid="transform-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        {/* 元 X の密度 */}
        <path
          d={path((v) => normalPdf(v, muX, sigmaX))}
          fill="none"
          stroke={COLOR_X}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {/* 変換後 Y の密度 */}
        <path
          d={path((v) => linearTransformNormalPdf(v, muX, sigmaX, a, b))}
          fill="none"
          stroke={COLOR_Y}
          strokeWidth={2.5}
        />
        {/* μ_X と μ_Y の縦線 */}
        <line
          x1={toX(muX)}
          y1={toY(0)}
          x2={toX(muX)}
          y2={PAD.top}
          stroke={COLOR_X}
          strokeWidth={1}
        />
        <line
          x1={toX(muY)}
          y1={toY(0)}
          x2={toX(muY)}
          y2={PAD.top}
          stroke={COLOR_Y}
          strokeWidth={1}
        />
        <text
          x={toX(muY)}
          y={PAD.top - 2}
          textAnchor="middle"
          className="fill-blue-700 text-[10px] font-semibold"
        >
          μ_Y={formatNumber(muY)}
        </text>
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: COLOR_X }}
          />
          元 X ~ N({formatNumber(muX)},{formatNumber(sigmaX)}²)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: COLOR_Y }} />
          Y=aX+b ~ N({formatNumber(muY)},{formatNumber(sigmaY)}²)
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="ヤコビアン：面積（確率）を保つために高さを 1/|a| 倍"
        body={`変換 Y=aX+b の密度は f_Y(y)=f_X((y−b)/a)·|1/a|。横を ${formatNumber(
          Math.abs(a),
        )} 倍に伸ばすと、確率（面積）を 1 に保つため高さは 1/|a|=${formatNumber(jacobian)} 倍になる。`}
        note="b（平行移動）は形を変えず位置だけずらすので分散に効かない。a（スケール）は分散を a² 倍にする。"
        kind="explain"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ヒント: <span style={{ color: COLOR_A }}>a</span> を大きくすると曲線は «低く広く»（分散
        a²倍）、
        <span style={{ color: COLOR_B }}>b</span> は «左右に平行移動»。a
        を負にすると左右反転します。
      </p>
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
