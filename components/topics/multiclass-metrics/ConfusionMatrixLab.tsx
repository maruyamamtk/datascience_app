"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { CLASS_LABELS, CONFUSION_MATRIX } from "@/lib/stats/multiclass-metrics";
import { useMulticlassMetricsStore } from "@/lib/store/multiclass-metrics";
import { pct, ratio } from "./format";

const FORMULA_PREC = `\\mathrm{Precision}_k=\\dfrac{TP_k}{TP_k+FP_k}=\\dfrac{${term(
  "mc_prec_tp",
  "?",
)}}{${term("mc_prec_tp2", "?")}+${term("mc_prec_fp", "?")}}=${term("mc_prec_val", "?")}`;
const FORMULA_RECALL = `\\mathrm{Recall}_k=\\dfrac{TP_k}{TP_k+FN_k}=\\dfrac{${term(
  "mc_rec_tp",
  "?",
)}}{${term("mc_rec_tp2", "?")}+${term("mc_rec_fn", "?")}}=${term("mc_rec_val", "?")}`;
const FORMULA_F1 = `F_{1,k}=\\dfrac{2\\cdot P_k\\cdot R_k}{P_k+R_k}=\\dfrac{2\\times${term(
  "mc_f1_p",
  "?",
)}\\times${term("mc_f1_r", "?")}}{${term("mc_f1_p2", "?")}+${term("mc_f1_r2", "?")}}=${term(
  "mc_f1_val",
  "?",
)}`;

const COLOR_DIAG = "#2563eb";
const COLOR_OFFDIAG = "#dc2626";

const MAX_COUNT = Math.max(...CONFUSION_MATRIX.flat());

/**
 * 多クラス分類の評価指標 操作ラボ(描画層/Control層, Level0)。
 * 「ニュース記事の自動分類」(3クラス)の固定N×N混同行列をヒートマップで表示し、
 * クラスを1つ選ぶと、そのクラスをOne-vs-Restの2値問題として切り出した
 * TP/FP/FN/TNとprecision/recall/F1が実時間で更新される(Issue #83 中核可視化)。
 * 操作値はuseMulticlassMetricsStoreがsingle source of truth。
 */
export function ConfusionMatrixLab() {
  const selectedClass = useMulticlassMetricsStore((s) => s.controls.selectedClass);
  const d = useMulticlassMetricsStore((s) => s.derived);
  const setControl = useMulticlassMetricsStore((s) => s.setControl);

  const mathRefPrec = useRef<MathFormulaHandle>(null);
  const mathRefRecall = useRef<MathFormulaHandle>(null);
  const mathRefF1 = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefPrec.current;
    if (!m) return;
    m.setValue("mc_prec_tp", String(d.selected.counts.tp));
    m.setValue("mc_prec_tp2", String(d.selected.counts.tp));
    m.setValue("mc_prec_fp", String(d.selected.counts.fp));
    m.setValue("mc_prec_val", d.selected.precision === null ? "\\text{定義不可}" : formatNumber(d.selected.precision, 3));
    m.setHighlight("mc_prec_tp", true, "#7c3aed");
    m.setHighlight("mc_prec_tp2", true, "#7c3aed");
    m.setHighlight("mc_prec_val", true, "#7c3aed");
  }, [d.selected]);

  useEffect(() => {
    const m = mathRefRecall.current;
    if (!m) return;
    m.setValue("mc_rec_tp", String(d.selected.counts.tp));
    m.setValue("mc_rec_tp2", String(d.selected.counts.tp));
    m.setValue("mc_rec_fn", String(d.selected.counts.fn));
    m.setValue("mc_rec_val", d.selected.recall === null ? "\\text{定義不可}" : formatNumber(d.selected.recall, 3));
    m.setHighlight("mc_rec_tp", true, "#059669");
    m.setHighlight("mc_rec_tp2", true, "#059669");
    m.setHighlight("mc_rec_val", true, "#059669");
  }, [d.selected]);

  useEffect(() => {
    const m = mathRefF1.current;
    if (!m) return;
    const p = d.selected.precision;
    const r = d.selected.recall;
    m.setValue("mc_f1_p", p === null ? "?" : formatNumber(p, 2));
    m.setValue("mc_f1_r", r === null ? "?" : formatNumber(r, 2));
    m.setValue("mc_f1_p2", p === null ? "?" : formatNumber(p, 2));
    m.setValue("mc_f1_r2", r === null ? "?" : formatNumber(r, 2));
    m.setValue("mc_f1_val", d.selected.f1 === null ? "\\text{定義不可}" : formatNumber(d.selected.f1, 3));
    m.setHighlight("mc_f1_val", true, "#ea580c");
  }, [d.selected]);

  return (
    <div
      id="multiclass-metrics-lab"
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm text-slate-600">
        「ニュース記事の自動分類」(3クラス、全100件)の混同行列。行=実際のクラス、列=予測したクラス。
        下のクラスを選ぶと、そのクラスを「陽性」・残り全部を「陰性」とみなすOne-vs-Rest分解の
        TP・FP・FN・TNとprecision・recall・F1が実時間で更新される。
      </p>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="クラスを選択">
        {CLASS_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setControl("selectedClass", i)}
            aria-pressed={selectedClass === i}
            data-testid={`class-select-${i}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selectedClass === i
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}(n={d.perClass[i].support})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table
          className="mx-auto w-full max-w-md border-collapse text-center text-xs"
          data-testid="multiclass-confusion-matrix"
        >
          <thead>
            <tr>
              <th className="p-1" />
              {CLASS_LABELS.map((label, j) => (
                <th key={label} className={`p-1 font-medium ${selectedClass === j ? "text-slate-900" : "text-slate-500"}`}>
                  予測:{label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLASS_LABELS.map((rowLabel, i) => (
              <tr key={rowLabel}>
                <th className={`p-1 font-medium ${selectedClass === i ? "text-slate-900" : "text-slate-500"}`}>
                  実際:{rowLabel}
                </th>
                {CLASS_LABELS.map((_, j) => {
                  const count = CONFUSION_MATRIX[i][j];
                  const isDiag = i === j;
                  const opacity = Math.max(0.12, count / MAX_COUNT);
                  const isSelected = i === selectedClass || j === selectedClass;
                  return (
                    <td
                      key={j}
                      onClick={() => setControl("selectedClass", isDiag ? i : selectedClass)}
                      data-testid={`matrix-cell-${i}-${j}`}
                      className={`rounded-lg p-2 font-mono font-semibold ${
                        isSelected ? "ring-2 ring-slate-900 ring-offset-1" : ""
                      } ${isDiag ? "cursor-pointer" : ""}`}
                      style={{
                        backgroundColor: isDiag ? COLOR_DIAG : COLOR_OFFDIAG,
                        opacity,
                        color: opacity > 0.4 ? "#fff" : "#1e293b",
                      }}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <p className="mb-1 text-center text-xs text-slate-500">
          「{CLASS_LABELS[selectedClass]}」 vs 残り全部(One-vs-Rest)
        </p>
        <table className="mx-auto w-full max-w-xs border-collapse text-center text-xs" data-testid="ovr-breakdown">
          <thead>
            <tr>
              <th className="p-1" />
              <th className="p-1 font-medium text-slate-500">予測: {CLASS_LABELS[selectedClass]}</th>
              <th className="p-1 font-medium text-slate-500">予測: それ以外</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="p-1 font-medium text-slate-500">実際: {CLASS_LABELS[selectedClass]}</th>
              <td className="rounded-lg bg-blue-50 p-2 font-mono font-semibold text-blue-700">
                TP={d.selected.counts.tp}
              </td>
              <td className="rounded-lg bg-amber-50 p-2 font-mono font-semibold text-amber-700">
                FN={d.selected.counts.fn}
              </td>
            </tr>
            <tr>
              <th className="p-1 font-medium text-slate-500">実際: それ以外</th>
              <td className="rounded-lg bg-red-50 p-2 font-mono font-semibold text-red-700">
                FP={d.selected.counts.fp}
              </td>
              <td className="rounded-lg bg-slate-50 p-2 font-mono font-semibold text-slate-700">
                TN={d.selected.counts.tn}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefPrec} tex={FORMULA_PREC} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefRecall} tex={FORMULA_RECALL} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefF1} tex={FORMULA_F1} display={false} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Precision" value={pct(d.selected.precision)} color="#7c3aed" />
        <Stat label="Recall" value={pct(d.selected.recall)} color="#059669" />
        <Stat label="F1" value={ratio(d.selected.f1)} color="#ea580c" />
      </div>

      <Callout
        title="クラスを選ぶたびに、二値分類とまったく同じ式でTP/FP/FN/TNが計算し直される"
        body="One-vs-Rest分解では「選んだクラス」を陽性、残り全部をまとめて陰性とみなす——だからprecision/recall/F1の定義式自体は二値分類のときと1文字も変わらない。"
        note="「エンタメ」を選ぶとTP・支援件数(support)が最も小さく、precision・recallも他の2クラスより低いことを確認しよう(あとの平均化で効いてくる)。"
        kind="explain"
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className="font-mono text-sm font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
