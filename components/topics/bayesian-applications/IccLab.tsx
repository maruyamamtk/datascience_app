"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { irtProbability, itemCharacteristicCurve } from "@/lib/stats/bayesian-applications";
import { ICC_COMPARISON_ITEMS, useBayesianApplicationsStore } from "@/lib/store/bayesian-applications";
import { num, pct, round2 } from "./format";

const FORMULA = `P(\\theta)=\\sigma\\bigl(${term("a", "?")}(${term("theta", "?")}-${term(
  "b",
  "?",
)})\\bigr)=${term("p", "?")}`;

const THETA_MIN = -4;
const THETA_MAX = 4;
const COLORS = ["#16a34a", "#2563eb", "#dc2626"];

const W = 340;
const H = 190;
const PAD = { top: 10, right: 14, bottom: 24, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function toCx(theta: number): number {
  return round2(PAD.left + ((theta - THETA_MIN) / (THETA_MAX - THETA_MIN)) * CW);
}
function toCy(p: number): number {
  return round2(PAD.top + CH - p * CH);
}

/**
 * 項目特性曲線(ICC)比較ラボ(Level2, 描画層/Control層)。
 * 能力θをスライダーで操作すると、識別力aが異なる3項目のICC上の正答確率が同時にハイライトされる。
 * 識別力が高い項目ほどθ=b付近で曲線が急に立ち上がり、能力差を鋭く識別できることを体感する
 * (2PLモデルはロジスティック回帰と同じシグモイド関数を使う——質的回帰トピックと同じ骨格)。
 */
export function IccLab() {
  const theta = useBayesianApplicationsStore((s) => s.controls.iccTheta);
  const iccProbs = useBayesianApplicationsStore((s) => s.derived.iccProbs);
  const setControl = useBayesianApplicationsStore((s) => s.setControl);

  const curves = useMemo(
    () => ICC_COMPARISON_ITEMS.map((item) => itemCharacteristicCurve(item, THETA_MIN, THETA_MAX)),
    [],
  );

  const focusItem = ICC_COMPARISON_ITEMS[1]; // 標準の識別力の項目を数式の主役にする
  const focusP = iccProbs[1]?.p ?? irtProbability(theta, focusItem);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("a", formatNumber(focusItem.a, 1));
    m.setValue("theta", formatNumber(theta, 1));
    m.setValue("b", formatNumber(focusItem.b, 1));
    m.setValue("p", pct(focusP, 1));
    m.setHighlight("theta", true, "#2563eb");
    m.setHighlight("p", true, "#2563eb");
  }, [theta, focusItem, focusP]);

  return (
    <div id="icc-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        能力θを動かすと、識別力a(困難度b=0で揃えた3項目)それぞれの項目特性曲線(ICC)上での正答確率が
        同時にハイライトされる。識別力が高い(急な)項目ほど、θ=0付近のわずかな能力差で正答確率が大きく変わる
        ——«能力を精密に測れる»項目ということ。
      </p>

      <label className="flex flex-col gap-1 text-sm text-slate-700">
        能力 θ = {num(theta, 1)}
        <input
          type="range"
          min={THETA_MIN}
          max={THETA_MAX}
          step={0.1}
          value={theta}
          onChange={(e) => setControl("iccTheta", Number(e.target.value))}
          aria-label="能力theta"
          data-testid="icc-theta-slider"
          className="accent-blue-600"
        />
      </label>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="識別力が異なる3項目の項目特性曲線" data-testid="icc-svg">
        <line x1={PAD.left} y1={PAD.top + CH} x2={W - PAD.right} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={toCy(0.5)} x2={W - PAD.right} y2={toCy(0.5)} stroke="#e2e8f0" strokeDasharray="2 2" />
        {curves.map((curve, ci) => (
          <polyline
            key={ICC_COMPARISON_ITEMS[ci].id}
            points={curve.map((pt) => `${toCx(pt.theta)},${toCy(pt.p)}`).join(" ")}
            fill="none"
            stroke={COLORS[ci]}
            strokeWidth={2}
            data-testid={`icc-curve-${ci}`}
          />
        ))}
        <line x1={toCx(theta)} y1={PAD.top} x2={toCx(theta)} y2={PAD.top + CH} stroke="#0f172a" strokeDasharray="3 2" data-testid="icc-theta-marker" />
        {iccProbs.map((entry, i) => (
          <circle
            key={ICC_COMPARISON_ITEMS[i].id}
            cx={toCx(theta)}
            cy={toCy(entry.p)}
            r={4.5}
            fill={COLORS[i]}
            stroke="#0f172a"
            strokeWidth={1}
            data-testid={`icc-dot-${i}`}
          />
        ))}
        {[THETA_MIN, 0, THETA_MAX].map((t) => (
          <text key={t} x={toCx(t)} y={PAD.top + CH + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {t}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-[11px]">
        {ICC_COMPARISON_ITEMS.map((item, i) => (
          <span key={item.id} className="flex items-center gap-1" data-testid={`icc-legend-${i}`}>
            <span className="h-2 w-4 rounded-full" style={{ background: COLORS[i] }} />
            {item.label}: P={pct(iccProbs[i]?.p ?? 0, 1)}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <Callout
        title="識別力aは«傾きの急さ»、困難度bは«曲線の位置»"
        body="bはP(θ)=0.5になるθの位置(3項目ともb=0に揃えている)。aが大きいほどbの近くで曲線が急に立ち上がり、bから離れた能力帯ではどの項目もP≈0またはP≈1に張り付いて能力差を識別できなくなる。"
        note="実務ではθの推定に使いたい能力帯に合わせて、識別力の高い項目を選んでテストを構成する(項目バンクの設計)。"
        kind="explain"
      />
    </div>
  );
}
