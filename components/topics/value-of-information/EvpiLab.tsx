"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import { evpi } from "@/lib/stats/value-of-information";
import { useValueOfInformationStore } from "@/lib/store/value-of-information";
import { num, pct, round2 } from "./format";

const FORMULA = `\\mathrm{EVPI}=\\sum_\\theta ${term("p", "?")}\\cdot\\max_a c(a,\\theta)-\\max_a\\mathrm{ESV}(a)=${term(
  "perfect",
  "?",
)}-${term("prior", "?")}=${term("gap", "?")}`;

const COLOR_BEST = "#2563eb";
const COLOR_PERFECT = "#f59e0b";
const COLOR_EVPI = "#dc2626";

const W = 320;
const H = 150;
const PAD = { top: 10, right: 14, bottom: 22, left: 34 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

/**
 * EVPIラボ(L1〜L2の中核可視化)。好況になる事前確率pをスライダーで動かすと、
 * ESV(事前情報のみ)・完全情報の期待利得・EVPI(その差)がリアルタイムに再計算され、
 * 数式中の該当値もハイライトされる(操作→図→数式の強連動)。
 * 下にはEVPI(p)の曲線を描き、現在のpの位置をマーカーで示す。
 */
export function EvpiLab() {
  const probGood = useValueOfInformationStore((s) => s.controls.probGood);
  const actions = useValueOfInformationStore((s) => s.derived.actions);
  const esv = useValueOfInformationStore((s) => s.derived.esv);
  const perfectInfoEsvValue = useValueOfInformationStore((s) => s.derived.perfectInfoEsv);
  const evpiValue = useValueOfInformationStore((s) => s.derived.evpi);
  const setControl = useValueOfInformationStore((s) => s.setControl);

  const priorBest = esv.scores[esv.bestIndex];
  const maxAbs = Math.max(1, ...esv.scores.map((v) => Math.abs(v)), perfectInfoEsvValue);

  const curve = useMemo(() => {
    const points: { p: number; v: number }[] = [];
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      points.push({ p, v: evpi(PRIMARY_PAYOFF_MATRIX, [p, 1 - p]) });
    }
    return points;
  }, []);
  const maxCurveY = Math.max(1, ...curve.map((c) => c.v));

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("p", formatNumber(probGood, 2));
    m.setValue("perfect", formatNumber(perfectInfoEsvValue, 0));
    m.setValue("prior", formatNumber(priorBest, 0));
    m.setValue("gap", formatNumber(evpiValue, 0));
    m.setHighlight("p", true, COLOR_BEST);
    m.setHighlight("perfect", true, COLOR_PERFECT);
    m.setHighlight("prior", true, COLOR_BEST);
    m.setHighlight("gap", true, COLOR_EVPI);
  }, [probGood, perfectInfoEsvValue, priorBest, evpiValue]);

  const sx = (p: number) => round2(PAD.left + p * CW);
  const sy = (v: number) => round2(PAD.top + CH - (v / maxCurveY) * CH);
  const curvePoints = curve.map((c) => `${sx(c.p)},${sy(c.v)}`).join(" ");
  const markerX = sx(probGood);
  const markerY = sy(evpiValue);

  return (
    <div id="evpi-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        好況になる確率 p を動かすと、事前情報のみの最善ESV・完全情報の期待利得・その差
        <strong className="font-semibold text-slate-900">EVPI</strong>
        がどう変わるかを確かめよう。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        好況になる確率 p = {pct(probGood)}(不況になる確率は {pct(1 - probGood)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={probGood}
          onChange={(e) => setControl("probGood", Number(e.target.value))}
          aria-label="好況になる確率p"
          data-testid="evpi-prob-good-slider"
          className="accent-blue-600"
        />
      </label>

      <div className="space-y-2" data-testid="evpi-esv-bars">
        {actions.map((a, i) => {
          const v = esv.scores[i];
          const widthPct = (Math.abs(v) / maxAbs) * 100;
          const isBest = i === esv.bestIndex;
          return (
            <div key={a} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-16 shrink-0 text-right font-medium">{a}</span>
              <div className="h-4 flex-1 rounded bg-slate-100">
                <div
                  className={`h-4 rounded ${isBest ? "bg-blue-600" : "bg-slate-400"}`}
                  style={{ width: `${widthPct}%` }}
                  data-testid={`evpi-esv-bar-${i}`}
                />
              </div>
              <span className={`w-16 shrink-0 font-mono ${isBest ? "font-bold text-blue-700" : ""}`}>
                {num(v)}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-16 shrink-0 text-right font-medium">完全情報</span>
          <div className="h-4 flex-1 rounded bg-slate-100">
            <div
              className="h-4 rounded bg-amber-500"
              style={{ width: `${(perfectInfoEsvValue / maxAbs) * 100}%` }}
              data-testid="evpi-perfect-bar"
            />
          </div>
          <span className="w-16 shrink-0 font-mono font-bold text-amber-700">
            {num(perfectInfoEsvValue)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="EVPIとpの関係の曲線"
        data-testid="evpi-curve-svg"
      >
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <polyline points={curvePoints} fill="none" stroke={COLOR_EVPI} strokeWidth={2} data-testid="evpi-curve" />
        <circle cx={markerX} cy={markerY} r={4} fill={COLOR_EVPI} data-testid="evpi-curve-marker" />
        {[0, 0.5, 1].map((t) => (
          <text
            key={t}
            x={round2(PAD.left + t * CW)}
            y={PAD.top + CH + 14}
            textAnchor="middle"
            className="fill-slate-500 text-[9px]"
          >
            {t}
          </text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-slate-400 text-[9px]">
          p(好況になる確率)
        </text>
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <p className="text-xs text-slate-500">
        現在 EVPI={num(evpiValue)}(万円)——これが「どんな予測・情報に対しても支払ってよい金額の上限」。p=0またはp=1(状態が確定している)ではEVPIが0に近づくことも確かめよう。
      </p>
    </div>
  );
}
