"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { KL_CATEGORY_LABELS, useInformationTheoryStore } from "@/lib/store/information-theory";
import { num, pct } from "./format";

// D_KL(P‖Q) = Σ p log2(p/q) = 結果、D_KL(Q‖P) = 結果2（非対称性を並べて見せる）
const FORMULA = `D_{KL}(P\\Vert Q)=${term("pq", "?")}\\ \\text{bit},\\quad D_{KL}(Q\\Vert P)=${term(
  "qp",
  "?",
)}\\ \\text{bit}`;

const BAR_MAX_H = 90;

/**
 * KlDivergenceLab(L2): 「実際の分布P」と「予測分布Q」(天気予報の4カテゴリ)を
 * それぞれ4本のスライダーで編集すると、棒グラフとKLダイバージェンスD_KL(P‖Q)・D_KL(Q‖P)が
 * 実時間で再計算される。2方向のKLを並べて表示することで «非対称性(距離ではない)» を
 * 数値で直接確かめられる(操作→グラフ→数式の強連動)。
 */
export function KlDivergenceLab() {
  const pWeights = useInformationTheoryStore((s) => s.controls.klPWeights);
  const qWeights = useInformationTheoryStore((s) => s.controls.klQWeights);
  const { klP, klQ, klPQ, klQP } = useInformationTheoryStore((s) => s.derived);
  const setControl = useInformationTheoryStore((s) => s.setControl);

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m) return;
    m.setValue("pq", formatNumber(klPQ, 4));
    m.setValue("qp", formatNumber(klQP, 4));
    m.setHighlight("pq", true, "#7c3aed");
    m.setHighlight("qp", true, "#dc2626");
  }, [klPQ, klQP]);

  const setWeight = (which: "klPWeights" | "klQWeights", idx: number, value: number) => {
    const source = which === "klPWeights" ? pWeights : qWeights;
    const next = [...source];
    next[idx] = value;
    setControl(which, next);
  };

  return (
    <div
      id="kl-divergence-lab"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        天気予報を例に、«実際の分布P»と«予測(近似)分布Q»を4カテゴリのスライダーで編集し、
        KLダイバージェンスがPとQのどちらを基準にするかで値が変わる（非対称）ことを確かめよう。
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-violet-700">P: 実際の分布</p>
          {KL_CATEGORY_LABELS.map((label, i) => (
            <div key={label} className="space-y-1">
              <label htmlFor={`kl-p-${i}`} className="text-xs text-slate-600">
                {label} = {pct(klP[i])}
              </label>
              <input
                id={`kl-p-${i}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={pWeights[i]}
                onChange={(e) => setWeight("klPWeights", i, Number(e.target.value))}
                className="w-full accent-violet-600"
                aria-label={`Pの${label}`}
                data-testid={`kl-p-slider-${i}`}
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-cyan-700">Q: 予測(近似)分布</p>
          {KL_CATEGORY_LABELS.map((label, i) => (
            <div key={label} className="space-y-1">
              <label htmlFor={`kl-q-${i}`} className="text-xs text-slate-600">
                {label} = {pct(klQ[i])}
              </label>
              <input
                id={`kl-q-${i}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={qWeights[i]}
                onChange={(e) => setWeight("klQWeights", i, Number(e.target.value))}
                className="w-full accent-cyan-600"
                aria-label={`Qの${label}`}
                data-testid={`kl-q-slider-${i}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 320 ${BAR_MAX_H + 30}`}
          className="mx-auto w-full max-w-md"
          role="img"
          aria-label="PとQの分布比較の棒グラフ"
        >
          {KL_CATEGORY_LABELS.map((label, i) => {
            const groupW = 320 / KL_CATEGORY_LABELS.length;
            const x0 = i * groupW + 10;
            const hP = klP[i] * BAR_MAX_H;
            const hQ = klQ[i] * BAR_MAX_H;
            return (
              <g key={label}>
                <rect
                  x={x0}
                  y={BAR_MAX_H - hP}
                  width={16}
                  height={hP}
                  fill="#7c3aed"
                  data-testid={`kl-bar-p-${i}`}
                />
                <rect
                  x={x0 + 18}
                  y={BAR_MAX_H - hQ}
                  width={16}
                  height={hQ}
                  fill="#0891b2"
                  data-testid={`kl-bar-q-${i}`}
                />
                <text x={x0 + 6} y={BAR_MAX_H + 14} className="fill-slate-500 text-[9px]">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRef} tex={FORMULA} display={false} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-violet-50 px-2 py-2 text-violet-700">
          <div className="font-mono text-base" data-testid="kl-pq-value">
            {num(klPQ, 4)} bit
          </div>
          <div className="text-violet-600">D_KL(P‖Q)：Pを基準にQで近似する損失</div>
        </div>
        <div className="rounded-lg bg-red-50 px-2 py-2 text-red-700">
          <div className="font-mono text-base" data-testid="kl-qp-value">
            {num(klQP, 4)} bit
          </div>
          <div className="text-red-600">D_KL(Q‖P)：Qを基準にPで近似する損失</div>
        </div>
      </div>

      <Callout
        title="KLダイバージェンスは«距離»ではない：向きで値が変わる"
        body={`D_KL(P‖Q)=${num(klPQ, 4)} bitとD_KL(Q‖P)=${num(klQP, 4)} bitは一般に一致しない——«距離»なら対称(A→BとB→Aが同じ)のはずだが、KLは非対称。PとQを完全に一致させるとどちらも0になる（試してみよう）。`}
        note="Qのどこかの確率を0にした状態でPの同じカテゴリだけ確率を残すと、D_KL(P‖Q)が発散する(∞になる)——«Qでは絶対に起きないとみなしていたのに、実際には起きた»という最大級のズレ。"
        kind="explain"
      />
    </div>
  );
}
