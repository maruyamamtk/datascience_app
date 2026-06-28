"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { logLikCurve } from "@/lib/stats/estimation";
import { ESTIMATION_SAMPLE, useEstimationStore } from "@/lib/store/estimation-methods";

const W = 360;
const H = 150;
const PAD = { top: 12, right: 14, bottom: 24, left: 14 };
const LO = 0.1;
const HI = 1.8;
const COLOR_CURVE = "#2563eb";
const COLOR_NOW = "#0891b2";
const COLOR_MLE = "#dc2626";

// 対数尤度を最大化する λ̂=1/x̄。λ・logL・λ̂ の項に id を付け、スライダーで差し込み＋ハイライト。
const FORMULA = `\\lambda=${term("lam", "\\lambda")},\\ \\log L(\\lambda)=${term(
  "ll",
  "?",
)}\\ \\to\\ \\max\\ \\text{at}\\ \\hat\\lambda=\\tfrac1{\\bar x}=${term("mle", "\\hat\\lambda")}`;

export function MleLab() {
  const lambda = useEstimationStore((s) => s.controls.lambda);
  const { logLik, mle, score } = useEstimationStore((s) => s.derived);
  const setControl = useEstimationStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const c = mathRef.current;
    if (!c) return;
    c.setValue("lam", formatNumber(lambda));
    c.setValue("ll", formatNumber(logLik));
    c.setValue("mle", formatNumber(mle));
    c.setHighlight("lam", true, COLOR_NOW);
    c.setHighlight("ll", true, COLOR_CURVE);
    c.setHighlight("mle", true, COLOR_MLE);
  }, [lambda, logLik, mle]);

  const curve = useMemo(() => logLikCurve(ESTIMATION_SAMPLE, LO, HI, 120), []);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (l: number) => PAD.left + ((l - LO) / (HI - LO)) * plotW;
  const toY = (lik: number) => PAD.top + (1 - lik) * plotH;
  const path = curve
    .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c.lambda).toFixed(1)},${toY(c.lik).toFixed(1)}`)
    .join(" ");

  // 現在 λ の正規化尤度（曲線上の点）。
  const nowLik = curve.reduce((best, c) =>
    Math.abs(c.lambda - lambda) < Math.abs(best.lambda - lambda) ? c : best,
  ).lik;

  return (
    <div
      id="estimation-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        指数分布の率 λ を動かして対数尤度を最大化（n={ESTIMATION_SAMPLE.length} の観測）
      </p>

      <div className="space-y-1">
        <label htmlFor="mle-lambda" className="text-sm font-semibold text-slate-700">
          λ = {formatNumber(lambda)}（勾配 d/dλ logL = {formatNumber(score)}）
        </label>
        <input
          id="mle-lambda"
          type="range"
          min={LO}
          max={HI}
          step={0.01}
          value={lambda}
          onChange={(e) => setControl("lambda", Number(e.target.value))}
          className="w-full accent-cyan-600"
          aria-label="率 λ"
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="対数尤度の最大化"
        data-testid="loglik-curve"
      >
        <line x1={PAD.left} y1={toY(0)} x2={W - PAD.right} y2={toY(0)} stroke="#cbd5e1" />
        <path d={path} fill="none" stroke={COLOR_CURVE} strokeWidth={2.5} />
        {/* MLE の頂上 */}
        <line
          x1={toX(mle)}
          y1={PAD.top}
          x2={toX(mle)}
          y2={toY(0)}
          stroke={COLOR_MLE}
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text
          x={toX(mle)}
          y={PAD.top - 1}
          textAnchor="middle"
          className="fill-red-600 text-[10px] font-semibold"
        >
          λ̂={formatNumber(mle)}
        </text>
        {/* 現在地 */}
        <line
          x1={toX(lambda)}
          y1={PAD.top}
          x2={toX(lambda)}
          y2={toY(0)}
          stroke={COLOR_NOW}
          strokeWidth={1}
        />
        <circle cx={toX(lambda)} cy={toY(nowLik)} r={4} fill={COLOR_NOW} />
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>

      <Callout
        title="最尤法：尤度（=データの起こりやすさ）を最大にする母数を選ぶ"
        body={`いま λ=${formatNumber(lambda)} で対数尤度は ${formatNumber(
          logLik,
        )}。勾配が ${formatNumber(score)}（${score > 0 ? "まだ増やせる" : score < 0 ? "増やしすぎ" : "頂上"}）。頂上 λ̂=1/x̄=${formatNumber(mle)} で最大になる。`}
        note="指数分布では最尤推定量＝標本平均の逆数。スライダーを動かし、勾配が 0 になる点（頂上）が λ̂ と一致することを確かめよう。"
        kind="explain"
      />
    </div>
  );
}
