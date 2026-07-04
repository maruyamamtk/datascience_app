"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { DT, STEPS, useStochasticStore } from "@/lib/store/stochastic-processes";

const W = 360;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 22, left: 30 };

// Var[B_t]=σ²t。var の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\operatorname{Var}[B_t]=\\sigma^2 t,\\quad \\operatorname{Var}[B_T]=${term("var", "?")}`;

export function BrownianLab() {
  const { sigma, mu } = useStochasticStore((s) => s.controls);
  const { paths, meanSeq, sdSeq, terminalVar } = useStochasticStore((s) => s.derived);
  const setControl = useStochasticStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("var", formatNumber(terminalVar, 2));
    m.setHighlight("var", true, "#2563eb");
  }, [terminalVar]);

  // 表示レンジ（±2σ√T ＋ ドリフト を収める）。
  const T = STEPS * DT;
  const maxAbs = Math.max(2 * sigma * Math.sqrt(T) + Math.abs(mu * T), 1) * 1.15;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (t: number) => PAD.left + (t / T) * plotW;
  const toY = (v: number) => PAD.top + (1 - (v + maxAbs) / (2 * maxAbs)) * plotH;
  const time = (k: number) => k * DT;

  const line = (pts: number[]) =>
    pts
      .map((v, k) => `${k === 0 ? "M" : "L"}${toX(time(k)).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");

  // ±2σ√t の帯（上枠→下枠）。
  const upper = meanSeq.map((m, k) => ({ t: time(k), v: m + 2 * sdSeq[k] }));
  const lower = meanSeq.map((m, k) => ({ t: time(k), v: m - 2 * sdSeq[k] }));
  const band =
    upper
      .map((p, k) => `${k === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.v).toFixed(1)}`)
      .join(" ") +
    " " +
    [...lower]
      .reverse()
      .map((p) => `L${toX(p.t).toFixed(1)},${toY(p.v).toFixed(1)}`)
      .join(" ") +
    " Z";

  return (
    <div
      id="stochastic-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="sp-sigma" className="text-xs font-semibold text-slate-700">
            ボラティリティ σ = {formatNumber(sigma)}
          </label>
          <input
            id="sp-sigma"
            type="range"
            min={0.2}
            max={2.5}
            step={0.1}
            value={sigma}
            onChange={(e) => setControl("sigma", Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label="ボラティリティ σ"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="sp-mu" className="text-xs font-semibold text-slate-700">
            ドリフト μ = {formatNumber(mu)}
          </label>
          <input
            id="sp-mu"
            type="range"
            min={-3}
            max={3}
            step={0.2}
            value={mu}
            onChange={(e) => setControl("mu", Number(e.target.value))}
            className="w-full accent-emerald-600"
            aria-label="ドリフト μ"
          />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="ブラウン運動"
        data-testid="brownian-plot"
      >
        {/* ±2σ√t の拡散帯 */}
        <path d={band} fill="#3b82f6" opacity={0.12} />
        {/* 中央（0）線 */}
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#e2e8f0" />
        {/* 標本パス */}
        {paths.map((p, i) => (
          <path key={i} d={line(p)} fill="none" stroke="#64748b" strokeWidth={0.7} opacity={0.5} />
        ))}
        {/* 平均ドリフト線 */}
        <path
          d={line(meanSeq)}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD.right}
          y={PAD.top + 8}
          textAnchor="end"
          className="fill-blue-600 text-[8px]"
        >
          ±2σ√t 帯
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        σ={formatNumber(sigma)}・μ={formatNumber(mu)}・終端 T={formatNumber(T)} で 分散=σ²T=
        {formatNumber(terminalVar, 2)}
      </p>

      <Callout
        title="ブラウン運動：独立な正規増分の積み重ね"
        body={`各微小時間 dt に独立な増分 N(μ·dt, σ²·dt) を足す。ボラティリティ σ=${formatNumber(
          sigma,
        )} を上げると拡散帯（±2σ√t）が √t で広がり、終端分散=σ²T=${formatNumber(
          terminalVar,
          2,
        )} が σ² に比例して増える。ドリフト μ=${formatNumber(mu)} は平均（緑破線）の傾き。`}
        note="分散が時間に比例（Var[B_t]=σ²t）＝標準偏差は √t で広がる «拡散»。連続だが至る所で微分不可能。株価・拡散・ノイズのモデルの基礎。"
        kind="explain"
      />
    </div>
  );
}
