"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import type { AveragingMethod } from "@/lib/stats/multiclass-metrics";
import { useMulticlassMetricsStore } from "@/lib/store/multiclass-metrics";
import { ratio, round2 } from "./format";

const FORMULA_MACRO = `\\mathrm{Macro}=\\dfrac{1}{K}\\sum_k \\mathrm{metric}_k=${term("avg_macro_val", "?")}`;
const FORMULA_MICRO = `\\mathrm{Micro}=\\dfrac{\\sum_k TP_k}{\\sum_k TP_k+\\sum_k FP_k}=${term("avg_micro_val", "?")}`;
const FORMULA_WEIGHTED = `\\mathrm{Weighted}=\\sum_k \\dfrac{n_k}{N}\\,\\mathrm{metric}_k=${term("avg_weighted_val", "?")}`;

const METHODS: { key: AveragingMethod; label: string; color: string }[] = [
  { key: "macro", label: "Macro", color: "#7c3aed" },
  { key: "micro", label: "Micro", color: "#059669" },
  { key: "weighted", label: "Weighted", color: "#ea580c" },
];

const BW = 300;
const ROW_H = 20;
const ROW_GAP = 8;

/**
 * AveragingLab(Level2): Macro・Micro・Weighted平均を切り替えながら、
 * precision・recall・F1がどれだけ乖離するかを一覧表とバーで比較するラボ。
 * MathFormulaは3つとも常時マウントしたまま(tasks/lessons.md #79の教訓:
 * 条件分岐でMathFormulaごと切替マウントしない)、選択中の方式だけをハイライト色で強調する。
 */
export function AveragingLab() {
  const method = useMulticlassMetricsStore((s) => s.controls.method);
  const d = useMulticlassMetricsStore((s) => s.derived);
  const setControl = useMulticlassMetricsStore((s) => s.setControl);

  const mathRefMacro = useRef<MathFormulaHandle>(null);
  const mathRefMicro = useRef<MathFormulaHandle>(null);
  const mathRefWeighted = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const macro = mathRefMacro.current;
    const micro = mathRefMicro.current;
    const weighted = mathRefWeighted.current;
    if (macro) {
      macro.setValue("avg_macro_val", d.macro.f1 === null ? "?" : formatNumber(d.macro.f1, 3));
      macro.setHighlight("avg_macro_val", method === "macro", "#7c3aed");
    }
    if (micro) {
      micro.setValue("avg_micro_val", d.micro.f1 === null ? "?" : formatNumber(d.micro.f1, 3));
      micro.setHighlight("avg_micro_val", method === "micro", "#059669");
    }
    if (weighted) {
      weighted.setValue("avg_weighted_val", d.weighted.f1 === null ? "?" : formatNumber(d.weighted.f1, 3));
      weighted.setHighlight("avg_weighted_val", method === "weighted", "#ea580c");
    }
  }, [d.macro, d.micro, d.weighted, method]);

  const gap = (d.macro.f1 ?? 0) < (d.micro.f1 ?? 0) ? (d.micro.f1 ?? 0) - (d.macro.f1 ?? 0) : 0;

  return (
    <div
      id="multiclass-metrics-averaging-lab"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        平均化方式を選ぶと、下の比較表・バー・数式で選んだ方式が強調される。
        「エンタメ」(少数派・低性能)が全体に与える影響が方式によってどれだけ違うかを比べよう。
      </p>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="平均化方式を選択">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setControl("method", m.key)}
            aria-pressed={method === m.key}
            data-testid={`method-select-${m.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              method === m.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-md border-collapse text-center text-xs" data-testid="averaging-comparison-table">
          <thead>
            <tr className="text-slate-500">
              <th className="p-1 text-left" />
              <th className={`p-1 ${method === "macro" ? "font-bold text-slate-900" : ""}`}>Macro</th>
              <th className={`p-1 ${method === "micro" ? "font-bold text-slate-900" : ""}`}>Micro</th>
              <th className={`p-1 ${method === "weighted" ? "font-bold text-slate-900" : ""}`}>Weighted</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="p-1 text-left font-medium text-slate-500">Precision</th>
              <td className={`p-1 font-mono ${method === "macro" ? "bg-violet-50 font-semibold" : ""}`}>{ratio(d.macro.precision)}</td>
              <td className={`p-1 font-mono ${method === "micro" ? "bg-emerald-50 font-semibold" : ""}`}>{ratio(d.micro.precision)}</td>
              <td className={`p-1 font-mono ${method === "weighted" ? "bg-orange-50 font-semibold" : ""}`}>{ratio(d.weighted.precision)}</td>
            </tr>
            <tr>
              <th className="p-1 text-left font-medium text-slate-500">Recall</th>
              <td className={`p-1 font-mono ${method === "macro" ? "bg-violet-50 font-semibold" : ""}`}>{ratio(d.macro.recall)}</td>
              <td className={`p-1 font-mono ${method === "micro" ? "bg-emerald-50 font-semibold" : ""}`}>{ratio(d.micro.recall)}</td>
              <td className={`p-1 font-mono ${method === "weighted" ? "bg-orange-50 font-semibold" : ""}`}>{ratio(d.weighted.recall)}</td>
            </tr>
            <tr>
              <th className="p-1 text-left font-medium text-slate-500">F1</th>
              <td className={`p-1 font-mono ${method === "macro" ? "bg-violet-50 font-semibold" : ""}`}>{ratio(d.macro.f1)}</td>
              <td className={`p-1 font-mono ${method === "micro" ? "bg-emerald-50 font-semibold" : ""}`}>{ratio(d.micro.f1)}</td>
              <td className={`p-1 font-mono ${method === "weighted" ? "bg-orange-50 font-semibold" : ""}`}>{ratio(d.weighted.f1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${BW} ${3 * (ROW_H + ROW_GAP)}`} className="mx-auto w-full max-w-sm" role="img" aria-label="F1のMacro・Micro・Weighted比較">
          {METHODS.map((m, i) => {
            const value = i === 0 ? d.macro.f1 : i === 1 ? d.micro.f1 : d.weighted.f1;
            const w = round2((value ?? 0) * (BW - 100));
            const y = i * (ROW_H + ROW_GAP);
            const active = method === m.key;
            return (
              <g key={m.key}>
                <text x={0} y={y + ROW_H / 2 + 4} className="fill-slate-600 text-[10px]">
                  {m.label}
                </text>
                <rect
                  x={80}
                  y={y}
                  width={w}
                  height={ROW_H}
                  fill={m.color}
                  opacity={active ? 1 : 0.45}
                  rx={3}
                  data-testid={`averaging-bar-${m.key}`}
                />
                <text x={86 + w} y={y + ROW_H / 2 + 4} className="fill-slate-700 text-[10px]">
                  {formatNumber(value ?? 0, 3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefMacro} tex={FORMULA_MACRO} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefMicro} tex={FORMULA_MICRO} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-3 text-center">
          <MathFormula ref={mathRefWeighted} tex={FORMULA_WEIGHTED} display={false} />
        </div>
      </div>

      <Callout
        title="恒等式: Weighted RecallはMicroや正解率と常に一致する"
        body={`いまの正解率(Accuracy)=${formatNumber(d.accuracy, 3)}。Weighted Recall=${ratio(
          d.weighted.recall,
        )}・Micro Recall=${ratio(d.micro.recall)}は理論上つねに正解率と完全一致する(単一ラベル多クラス分類の代数的な恒等式)。一方Weighted PrecisionとMicro Precisionは一致するとは限らない。`}
        note={`Macro F1(${ratio(d.macro.f1)})はMicro F1(${ratio(
          d.micro.f1,
        )})より${gap > 0 ? `約${formatNumber(gap, 2)}低い` : "ほぼ同じ"}——少数派クラス「エンタメ」の低い性能が、クラスの大きさを無視するMacroに強く効いている。`}
        kind="explain"
      />
    </div>
  );
}
