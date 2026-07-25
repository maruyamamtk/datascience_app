"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { utilityCara } from "@/lib/stats/utility-theory";
import { FOCUS_LOTTERY_OUTCOMES, useUtilityTheoryStore } from "@/lib/store/utility-theory";
import { num, pct, riskAttitudeLabel, round2 } from "./format";

const FORMULA = `u(x;${term("alpha", "\\alpha")})=\\frac{1-e^{-\\alpha x}}{\\alpha},\\quad \\mathrm{CE}=${term(
  "ce",
  "?",
)},\\quad \\mathrm{RP}=E[X]-\\mathrm{CE}=${term("ex", "?")}-${term("ce2", "?")}=${term("rp", "?")}`;

const W = 320;
const H = 150;
const PAD = { top: 10, right: 14, bottom: 22, left: 20 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * 効用理論(P-4)の中核ラボ(L1〜L2)。リスク回避度α(CARA効用)と好況になる確率pを
 * スライダーで動かすと、①2台稼働のくじの効用曲線・CE・リスクプレミアムがリアルタイムに
 * 再計算され、②同じ利得行列に対する期待金額(ESV)最大化と期待効用(EU)最大化の意思決定が
 * 一致するか食い違うかを確かめられる(操作→図→数式の強連動)。
 */
export function UtilityDecisionLab() {
  const alpha = useUtilityTheoryStore((s) => s.controls.alpha);
  const probGood = useUtilityTheoryStore((s) => s.controls.probGood);
  const actions = useUtilityTheoryStore((s) => s.derived.actions);
  const riskAttitude = useUtilityTheoryStore((s) => s.derived.riskAttitude);
  const comparison = useUtilityTheoryStore((s) => s.derived.comparison);
  const focusEx = useUtilityTheoryStore((s) => s.derived.focusExpectedValue);
  const focusCe = useUtilityTheoryStore((s) => s.derived.focusCertaintyEquivalent);
  const focusRp = useUtilityTheoryStore((s) => s.derived.focusRiskPremium);
  const setControl = useUtilityTheoryStore((s) => s.setControl);

  const { esv, eu, diverge } = comparison;
  const maxEsvAbs = Math.max(1, ...esv.scores.map((v) => Math.abs(v)));
  const maxEuAbs = Math.max(1, ...eu.scores.map((v) => Math.abs(v)));

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("alpha", formatNumber(alpha, 4));
    m.setValue("ce", formatNumber(focusCe, 0));
    m.setValue("ex", formatNumber(focusEx, 0));
    m.setValue("ce2", formatNumber(focusCe, 0));
    m.setValue("rp", formatNumber(focusRp, 0));
    const color = focusRp > 1e-6 ? "#dc2626" : focusRp < -1e-6 ? "#16a34a" : "#64748b";
    m.setHighlight("alpha", true, "#7c3aed");
    m.setHighlight("ce", true, color);
    m.setHighlight("rp", true, color);
  }, [alpha, focusCe, focusEx, focusRp]);

  // 効用曲線(2台稼働のくじ: 好況700/不況−300の間だけ描く)。
  const [xBad, xGood] =
    FOCUS_LOTTERY_OUTCOMES[1] < FOCUS_LOTTERY_OUTCOMES[0]
      ? [FOCUS_LOTTERY_OUTCOMES[1], FOCUS_LOTTERY_OUTCOMES[0]]
      : [FOCUS_LOTTERY_OUTCOMES[0], FOCUS_LOTTERY_OUTCOMES[1]];
  const yBad = utilityCara(xBad, alpha);
  const yGood = utilityCara(xGood, alpha);
  const yMin = Math.min(yBad, yGood);
  const yMax = Math.max(yBad, yGood);
  const ySpan = Math.max(1e-9, yMax - yMin);
  const sx = (x: number) => round2(PAD.left + ((x - xBad) / (xGood - xBad)) * CW);
  const sy = (y: number) => round2(PAD.top + CH - ((y - yMin) / ySpan) * CH);
  const curvePoints = Array.from({ length: 41 }, (_, i) => {
    const x = xBad + ((xGood - xBad) * i) / 40;
    return `${sx(x)},${sy(utilityCara(x, alpha))}`;
  }).join(" ");
  const curveYAtCe = utilityCara(focusCe, alpha);
  const chordYAtEx = yBad + ((yGood - yBad) * (focusEx - xBad)) / (xGood - xBad);

  return (
    <div
      id="utility-decision-lab"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        リスク回避度 α と好況になる確率 p を動かして、
        <strong className="font-semibold text-slate-900">期待金額(ESV)</strong>で選ぶ行動と
        <strong className="font-semibold text-slate-900">期待効用(EU)</strong>で選ぶ行動が
        食い違うことがあるかを確かめよう。
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          リスク回避度 α = {formatNumber(alpha, 4)}({riskAttitudeLabel(riskAttitude)})
          <input
            type="range"
            min={-0.006}
            max={0.008}
            step={0.0005}
            value={alpha}
            onChange={(e) => setControl("alpha", Number(e.target.value))}
            aria-label="リスク回避度アルファ"
            data-testid="utility-alpha-slider"
            className="accent-purple-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          好況になる確率 p = {pct(probGood)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={probGood}
            onChange={(e) => setControl("probGood", Number(e.target.value))}
            aria-label="好況になる確率p"
            data-testid="utility-prob-good-slider"
            className="accent-blue-600"
          />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">ESV(期待金額)最大化</p>
          {actions.map((a, i) => {
            const v = esv.scores[i];
            const isBest = i === esv.bestIndex;
            return (
              <div key={a} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-16 shrink-0 text-right font-medium">{a}</span>
                <div className="h-4 flex-1 rounded bg-slate-100">
                  <div
                    className={`h-4 rounded ${isBest ? "bg-blue-600" : "bg-slate-400"}`}
                    style={{ width: `${round2((Math.abs(v) / maxEsvAbs) * 100)}%` }}
                    data-testid={`utility-esv-bar-${i}`}
                  />
                </div>
                <span
                  className={`w-14 shrink-0 font-mono ${isBest ? "font-bold text-blue-700" : ""}`}
                >
                  {num(v)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">EU(期待効用)最大化</p>
          {actions.map((a, i) => {
            const v = eu.scores[i];
            const isBest = i === eu.bestIndex;
            return (
              <div key={a} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-16 shrink-0 text-right font-medium">{a}</span>
                <div className="h-4 flex-1 rounded bg-slate-100">
                  <div
                    className={`h-4 rounded ${isBest ? "bg-red-600" : "bg-slate-400"}`}
                    style={{ width: `${round2((Math.abs(v) / maxEuAbs) * 100)}%` }}
                    data-testid={`utility-eu-bar-${i}`}
                  />
                </div>
                <span
                  className={`w-14 shrink-0 font-mono ${isBest ? "font-bold text-red-700" : ""}`}
                >
                  {num(v, 1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div data-testid="utility-divergence-callout">
        <Callout
          kind={diverge ? "explain" : "supplement"}
          title={diverge ? "ESVとEUで選ぶ行動が食い違っている" : "ESVとEUは同じ行動を選んでいる"}
          body={
            diverge
              ? `ESVは「${actions[esv.bestIndex]}」を選ぶが、EUは「${actions[eu.bestIndex]}」を選ぶ——リスク回避的な意思決定者は、期待金額が高くても下振れの大きい行動を避ける。`
              : `現在の設定(α=${formatNumber(alpha, 4)}, p=${pct(probGood)})では、ESV最大化とEU最大化がどちらも「${actions[esv.bestIndex]}」を選んでいる。`
          }
          note="αを大きくする(よりリスク回避的にする)か、pを大きくして2台稼働のESVを1台稼働より優位にすると、食い違いが起きやすくなる。"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">
          効用曲線とCE・リスクプレミアム(2台稼働のくじ: 好況{num(FOCUS_LOTTERY_OUTCOMES[0])}/不況
          {num(FOCUS_LOTTERY_OUTCOMES[1])})
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto w-full max-w-md"
          role="img"
          aria-label="効用曲線とCE・リスクプレミアムの図"
          data-testid="utility-curve-svg"
        >
          <line
            x1={PAD.left}
            y1={PAD.top + CH}
            x2={W - PAD.right}
            y2={PAD.top + CH}
            stroke="#cbd5e1"
          />
          <line
            x1={sx(xBad)}
            y1={sy(yBad)}
            x2={sx(xGood)}
            y2={sy(yGood)}
            stroke="#cbd5e1"
            strokeDasharray="3 3"
          />
          <polyline
            points={curvePoints}
            fill="none"
            stroke="#7c3aed"
            strokeWidth={2.5}
            data-testid="utility-curve"
          />
          <line
            x1={sx(focusEx)}
            y1={sy(chordYAtEx)}
            x2={sx(focusEx)}
            y2={PAD.top + CH}
            stroke="#94a3b8"
            strokeDasharray="2 2"
          />
          <line
            x1={sx(focusCe)}
            y1={sy(curveYAtCe)}
            x2={sx(focusCe)}
            y2={PAD.top + CH}
            stroke="#94a3b8"
            strokeDasharray="2 2"
          />
          <circle
            cx={sx(focusEx)}
            cy={sy(chordYAtEx)}
            r={4}
            fill="#f59e0b"
            data-testid="utility-ex-marker"
          />
          <circle
            cx={sx(focusCe)}
            cy={sy(curveYAtCe)}
            r={4}
            fill="#7c3aed"
            data-testid="utility-ce-marker"
          />
          <text
            x={sx(focusEx)}
            y={PAD.top + CH + 12}
            textAnchor="middle"
            className="fill-amber-600 text-[8px] font-bold"
          >
            E[X]
          </text>
          <text
            x={sx(focusCe)}
            y={PAD.top + CH + 22}
            textAnchor="middle"
            className="fill-purple-700 text-[8px] font-bold"
          >
            CE
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        現在 E[X]={num(focusEx)}、CE={num(focusCe)}、リスクプレミアム RP={num(focusRp)}（
        {focusRp > 0 ? "正: リスク回避的" : focusRp < 0 ? "負: リスク受容的" : "0: リスク中立"}）。
      </p>
    </div>
  );
}
