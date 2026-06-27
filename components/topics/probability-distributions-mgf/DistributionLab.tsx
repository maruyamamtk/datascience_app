"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { useMassStore } from "@/lib/store/probability-distributions-mgf";

const W = 360;
const CHART_H = 110;
const PAD = { top: 10, right: 12, bottom: 22, left: 28 };

const COLOR_LE = "#2563eb"; // しきい値 x 以下（F に入る）
const COLOR_GT = "#cbd5e1"; // x より大きい（S に入る）
const COLOR_X = "#dc2626"; // しきい値マーカー

// F(x)=Σ_{k≤x}P(X=k)、S(x)=1−F(x)。値の項に id を付け操作で差し込み＋ハイライト。
const FORMULA = `F(${term("xv", "x")})=\\!\\!\\sum_{k\\le x}\\!\\!P(X=k)=${term(
  "fv",
  "F(x)",
)},\\quad S(x)=1-F(x)=${term("sv", "S(x)")}`;

export function DistributionLab() {
  const n = useMassStore((s) => s.controls.n);
  const p = useMassStore((s) => s.controls.p);
  const x = useMassStore((s) => s.controls.x);
  const { pmf, cdf, cdfAtX, survivalAtX, mean, variance } = useMassStore((s) => s.derived);
  const setControl = useMassStore((s) => s.setControl);
  const patchControls = useMassStore((s) => s.patchControls);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("xv", String(x));
    c.setValue("fv", formatNumber(cdfAtX));
    c.setValue("sv", formatNumber(survivalAtX));
    c.setHighlight("xv", true, COLOR_X);
    c.setHighlight("fv", true, COLOR_LE);
    c.setHighlight("sv", true, COLOR_GT);
  }, [x, cdfAtX, survivalAtX]);

  const cells = pmf.length;
  const plotW = W - PAD.left - PAD.right;
  const bandW = plotW / cells;
  const pmfMax = Math.max(...pmf, 0.0001);
  const barX = (k: number) => PAD.left + k * bandW + bandW * 0.15;
  const innerW = bandW * 0.7;

  // CDF 階段の座標。
  const cdfY = (f: number) => PAD.top + (1 - f) * (CHART_H - PAD.top - PAD.bottom);
  const stepX = (k: number) => PAD.left + k * bandW + bandW / 2;

  return (
    <div id="dist-operation" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      {/* n */}
      <Slider
        id="dl-n"
        label={`試行回数 n = ${n}`}
        min={2}
        max={20}
        step={1}
        value={n}
        onChange={(v) => patchControls({ n: v, x: Math.min(x, v) })}
        accent="accent-slate-700"
      />
      {/* p */}
      <Slider
        id="dl-p"
        label={`成功確率 p = ${formatNumber(p)}`}
        min={0.05}
        max={0.95}
        step={0.05}
        value={p}
        onChange={(v) => setControl("p", v)}
        accent="accent-blue-600"
      />
      {/* x */}
      <Slider
        id="dl-x"
        label={`しきい値 x = ${x}`}
        min={0}
        max={n}
        step={1}
        value={Math.min(x, n)}
        onChange={(v) => setControl("x", v)}
        accent="accent-red-600"
      />

      {/* 確率関数 PMF（x 以下は青、超は灰） */}
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-600">確率関数 P(X=k)（青=x以下）</p>
        <svg
          viewBox={`0 0 ${W} ${CHART_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="確率関数"
          data-testid="pmf-chart"
        >
          {pmf.map((pk, k) => {
            const h = (pk / pmfMax) * (CHART_H - PAD.top - PAD.bottom);
            return (
              <rect
                key={k}
                id={`bar-${k}`}
                x={barX(k)}
                y={CHART_H - PAD.bottom - h}
                width={innerW}
                height={h}
                fill={k <= x ? COLOR_LE : COLOR_GT}
              />
            );
          })}
          {/* しきい値マーカー */}
          <line
            x1={PAD.left + (x + 1) * bandW}
            y1={PAD.top}
            x2={PAD.left + (x + 1) * bandW}
            y2={CHART_H - PAD.bottom}
            stroke={COLOR_X}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          {[0, Math.floor(n / 2), n].map((k) => (
            <text
              key={k}
              x={stepX(k)}
              y={CHART_H - 6}
              textAnchor="middle"
              className="fill-slate-400 text-[9px]"
            >
              {k}
            </text>
          ))}
        </svg>
      </div>

      {/* 累積分布関数 CDF（階段） */}
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-600">累積分布関数 F(k)=P(X≤k)</p>
        <svg
          viewBox={`0 0 ${W} ${CHART_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="累積分布関数"
          data-testid="cdf-chart"
        >
          {/* y=1 と y=0 の補助線 */}
          <line x1={PAD.left} y1={cdfY(1)} x2={W - PAD.right} y2={cdfY(1)} stroke="#e2e8f0" />
          <line x1={PAD.left} y1={cdfY(0)} x2={W - PAD.right} y2={cdfY(0)} stroke="#e2e8f0" />
          {/* 階段 */}
          {cdf.map((f, k) => (
            <g key={k}>
              <line
                x1={PAD.left + k * bandW}
                y1={cdfY(f)}
                x2={PAD.left + (k + 1) * bandW}
                y2={cdfY(f)}
                stroke={k <= x ? COLOR_LE : "#94a3b8"}
                strokeWidth={2.5}
              />
            </g>
          ))}
          {/* F(x) のマーカー */}
          <circle cx={PAD.left + (x + 1) * bandW} cy={cdfY(cdfAtX)} r={4} fill={COLOR_X} />
          <text x={PAD.left} y={cdfY(1) - 2} className="fill-slate-400 text-[9px]">
            1.0
          </text>
        </svg>
      </div>

      {/* 強連動する数式 */}
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <span className="font-mono" style={{ color: COLOR_LE }}>
          F({x}) = {formatNumber(cdfAtX * 100, 1)}%
        </span>
        <span className="font-mono" style={{ color: COLOR_GT }}>
          S({x}) = {formatNumber(survivalAtX * 100, 1)}%
        </span>
        <span className="font-mono text-slate-600">
          μ=np={formatNumber(mean)}・σ²=np(1−p)={formatNumber(variance)}
        </span>
      </div>

      <Callout
        title="確率関数 → 累積分布関数 → 生存関数"
        body={`確率関数 P(X=k) を «x 以下» で足すと F(x)=P(X≤x)=${formatNumber(
          cdfAtX * 100,
          1,
        )}%。その残りが生存関数 S(x)=P(X>x)=${formatNumber(survivalAtX * 100, 1)}%。`}
        note="CDF は確率関数の積み上げなので必ず単調増加で右端は 1。生存関数は «それ以上になる» 確率（信頼性・待ち時間で活躍）。"
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
