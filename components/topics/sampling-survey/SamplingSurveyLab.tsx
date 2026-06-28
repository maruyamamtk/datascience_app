"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { STRATA, useSurveyStore, type SurveyMethod } from "@/lib/store/sampling-survey";

const METHODS: { id: SurveyMethod; label: string }[] = [
  { id: "srs", label: "単純無作為" },
  { id: "proportional", label: "層化・比例" },
  { id: "neyman", label: "層化・ネイマン" },
];

const STRATUM_COLORS = ["#2563eb", "#16a34a", "#dc2626"];

// SE=√Var。SE の項に id を付け、操作で差し込み＋ハイライト。
const FORMULA = `\\text{SE}=\\sqrt{\\operatorname{Var}(\\bar y)}=${term("se", "?")}`;

export function SamplingSurveyLab() {
  const { n, method } = useSurveyStore((s) => s.controls);
  const { popMean, se, seSrs, seProp, seNeyman, allocation } = useSurveyStore((s) => s.derived);
  const setControl = useSurveyStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("se", formatNumber(se, 3));
    m.setHighlight("se", true, "#7c3aed");
  }, [se]);

  const maxSe = Math.max(seSrs, seProp, seNeyman, 1e-6);
  const bars: { id: SurveyMethod; label: string; value: number }[] = [
    { id: "srs", label: "SRS", value: seSrs },
    { id: "proportional", label: "比例", value: seProp },
    { id: "neyman", label: "ネイマン", value: seNeyman },
  ];

  return (
    <div
      id="survey-operation"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        母集団（3層・母平均 {formatNumber(popMean, 1)}）から n={n} 人を抽出
      </p>

      {/* 層の構成（サイズと配分） */}
      <div className="space-y-1.5">
        {STRATA.map((s, j) => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-slate-600">{s.name}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full"
                style={{ width: `${(s.size / 1000) * 100}%`, background: STRATUM_COLORS[j] }}
              />
            </div>
            <span className="w-28 text-right font-mono text-slate-500">
              N={s.size}・σ={s.sd}・n_h={formatNumber(allocation[j], 0)}
            </span>
          </div>
        ))}
      </div>

      {/* 抽出法トグル */}
      <div className="flex gap-2" role="group" aria-label="抽出法">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setControl("method", m.id)}
            aria-pressed={method === m.id}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              method === m.id
                ? "border-violet-500 bg-violet-50 text-violet-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* n スライダー */}
      <div className="space-y-1">
        <label htmlFor="sv-n" className="text-sm font-semibold text-slate-700">
          標本サイズ n = {n}
        </label>
        <input
          id="sv-n"
          type="range"
          min={20}
          max={900}
          step={10}
          value={n}
          onChange={(e) => setControl("n", Number(e.target.value))}
          className="w-full accent-violet-600"
          aria-label="標本サイズ n"
        />
      </div>

      {/* SE 比較バー */}
      <svg
        viewBox="0 0 360 70"
        className="h-auto w-full"
        role="img"
        aria-label="標準誤差の比較"
        data-testid="se-bars"
      >
        {bars.map((b, i) => {
          const w = (b.value / maxSe) * 250;
          const active = b.id === method;
          return (
            <g key={b.id} opacity={active ? 1 : 0.45}>
              <text x={4} y={18 + i * 20} className="fill-slate-600 text-[9px]">
                {b.label}
              </text>
              <rect
                id={`bar-${b.id}`}
                x={50}
                y={10 + i * 20}
                width={w}
                height={12}
                rx={2}
                fill={active ? "#7c3aed" : "#cbd5e1"}
              />
              <text x={50 + w + 4} y={20 + i * 20} className="fill-slate-700 font-mono text-[9px]">
                {formatNumber(b.value, 3)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} />
      </div>
      <p className="text-center font-mono text-sm text-slate-600">
        標準誤差 SE={formatNumber(se, 3)}（SRS比 {formatNumber((se / seSrs) * 100, 0)}%）
      </p>

      <Callout
        title="層化抽出：層の中だけのばらつきにして精度を上げる"
        body={`同じ n=${n} でも、SRS の SE=${formatNumber(seSrs, 3)} に対し 層化（比例）${formatNumber(
          seProp,
          3,
        )}・ネイマン ${formatNumber(seNeyman, 3)}。層化は «層間の差» を推定誤差から除けるぶん精度が上がる。`}
        note="層が均質（層内のばらつきが小さく層間が大きい）ほど層化の効果が大きい。ネイマン配分はばらつきの大きい層に多く配って SE を最小化。n を増やすと全法で SE が下がる。"
        kind="explain"
      />
    </div>
  );
}
