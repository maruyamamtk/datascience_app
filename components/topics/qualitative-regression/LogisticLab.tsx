"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { logisticPredict } from "@/lib/stats/logistic";
import { LOGIT_DATA, useLogitStore } from "@/lib/store/qualitative-regression";

const W = 360;
const H = 180;
const PAD = { top: 14, right: 14, bottom: 26, left: 30 };
const X_MIN = -1;
const X_MAX = 5;

const COLOR_CURVE = "#2563eb";
const COLOR_Y1 = "#16a34a";
const COLOR_Y0 = "#dc2626";
const COLOR_BOUND = "#7c3aed";

// P(y=1|x)=σ(b0+b1x), オッズ比 e^{b1}。OR の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `P(y{=}1\\mid x)=\\sigma(${term("b0", "b_0")}+${term("b1", "b_1")}x),\\quad \\text{OR}=e^{b_1}=${term(
  "or",
  "?",
)}`;

export function LogisticLab() {
  const { b0, b1 } = useLogitStore((s) => s.controls);
  const { oddsRatio, logLik, x50 } = useLogitStore((s) => s.derived);
  const setControl = useLogitStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("b0", formatNumber(b0));
    m.setValue("b1", formatNumber(b1));
    m.setValue("or", formatNumber(oddsRatio));
    m.setHighlight("b0", true, COLOR_CURVE);
    m.setHighlight("b1", true, COLOR_CURVE);
    m.setHighlight("or", true, "#7c3aed");
  }, [b0, b1, oddsRatio]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const toY = (p: number) => PAD.top + (1 - p) * plotH;

  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i === 0 ? "M" : "L"}${toX(x).toFixed(1)},${toY(logisticPredict(x, b0, b1)).toFixed(1)}`;
  }).join(" ");

  return (
    <div
      id="logit-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        2値データ（緑=y1上 / 赤=y0下）にシグモイドを当てはめる
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ロジスティック回帰"
        data-testid="logit-plot"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        <line x1={PAD.left} y1={toY(1)} x2={W - PAD.right} y2={toY(1)} stroke="#e2e8f0" />
        <line x1={PAD.left} y1={toY(0.5)} x2={W - PAD.right} y2={toY(0.5)} stroke="#f1f5f9" />
        {/* データ点 */}
        {LOGIT_DATA.x.map((xi, i) => (
          <circle
            key={i}
            cx={toX(xi)}
            cy={toY(LOGIT_DATA.y[i] === 1 ? 0.97 : 0.03)}
            r={3}
            fill={LOGIT_DATA.y[i] === 1 ? COLOR_Y1 : COLOR_Y0}
            opacity={0.6}
          />
        ))}
        {/* シグモイド曲線 */}
        <path d={curve} fill="none" stroke={COLOR_CURVE} strokeWidth={2.5} />
        {/* 決定境界 P=0.5 */}
        {x50 >= X_MIN && x50 <= X_MAX && (
          <line
            x1={toX(x50)}
            y1={PAD.top}
            x2={toX(x50)}
            y2={toY(0)}
            stroke={COLOR_BOUND}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        )}
        <text
          x={PAD.left - 4}
          y={toY(1) + 3}
          textAnchor="end"
          className="fill-slate-400 text-[8px]"
        >
          1
        </text>
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
        id="lg-b0"
        label={`切片 b0 = ${formatNumber(b0)}`}
        min={-6}
        max={4}
        step={0.1}
        value={b0}
        onChange={(v) => setControl("b0", v)}
      />
      <Slider
        id="lg-b1"
        label={`傾き b1 = ${formatNumber(b1)}（対数オッズの変化率）`}
        min={-1}
        max={4}
        step={0.1}
        value={b1}
        onChange={(v) => setControl("b1", v)}
      />

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        オッズ比 OR=e^b1={formatNumber(oddsRatio)}・決定境界 x(P=0.5)={formatNumber(x50)}・対数尤度=
        {formatNumber(logLik, 1)}
      </p>

      <Callout
        title="ロジスティック回帰：確率を «対数オッズの線形» で表す"
        body={`線形 b0+b1x を シグモイド σ で 0〜1 の確率に写す。傾き b1 は «対数オッズ» の変化率で、x が1増えるとオッズが e^b1=${formatNumber(
          oddsRatio,
        )} 倍になる（オッズ比）。対数尤度 ${formatNumber(logLik, 1)} が大きいほどデータに合う。`}
        note="b1 を大きくすると S 字が急になり «効きが強い»、b0 で左右にシフト。直線回帰と違い予測が必ず0〜1に収まる。係数を動かして対数尤度を最大にしてみよう。"
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
