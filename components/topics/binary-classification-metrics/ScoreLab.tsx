"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { histogramBins } from "@/lib/stats/binary-classification-metrics";
import {
  AUC_VALUE,
  ROC_POINTS,
  SAMPLES,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  THRESHOLD_STEP,
  useBinaryClassificationMetricsStore,
} from "@/lib/store/binary-classification-metrics";
import { pct, ratio, round2 } from "./format";

const FORMULA_ACC = `\\mathrm{Accuracy}=\\dfrac{TP+TN}{N}=\\dfrac{${term("acc_tp", "?")}+${term(
  "acc_tn",
  "?",
)}}{${term("acc_n", "?")}}=${term("acc_val", "?")}`;
const FORMULA_PREC = `\\mathrm{Precision}=\\dfrac{TP}{TP+FP}=\\dfrac{${term("prec_tp_num", "?")}}{${term(
  "prec_tp_den",
  "?",
)}+${term("prec_fp", "?")}}=${term("prec_val", "?")}`;
const FORMULA_RECALL = `\\mathrm{Recall}=\\dfrac{TP}{TP+FN}=\\dfrac{${term("rec_tp_num", "?")}}{${term(
  "rec_tp_den",
  "?",
)}+${term("rec_fn", "?")}}=${term("rec_val", "?")}`;
const FORMULA_F1 = `F_1=\\dfrac{2\\cdot P\\cdot R}{P+R}=\\dfrac{2\\times${term("f1_p_num", "?")}\\times${term(
  "f1_r_num",
  "?",
)}}{${term("f1_p_den", "?")}+${term("f1_r_den", "?")}}=${term("f1_val", "?")}`;

// ヒストグラム座標系
const HW = 380;
const HH = 170;
const HPAD = { top: 10, right: 14, bottom: 26, left: 30 };
const HCW = HW - HPAD.left - HPAD.right;
const HCH = HH - HPAD.top - HPAD.bottom;
const BINS = histogramBins(SAMPLES, 10);
const MAX_COUNT = Math.max(1, ...BINS.map((b) => Math.max(b.posCount, b.negCount)));

// ミニROC座標系
const RW = 170;
const RH = 170;
const RPAD = { top: 8, right: 8, bottom: 20, left: 24 };
const RCW = RW - RPAD.left - RPAD.right;
const RCH = RH - RPAD.top - RPAD.bottom;
const rx = (v: number) => round2(RPAD.left + v * RCW);
const ry = (v: number) => round2(RPAD.top + (1 - v) * RCH);
const ROC_PATH = ROC_POINTS.map((p) => `${rx(p.fpr)},${ry(p.tpr)}`).join(" ");

const COLOR_POS = "#2563eb";
const COLOR_NEG = "#dc2626";
const COLOR_ACC = "#334155";
const COLOR_PREC = "#7c3aed";
const COLOR_RECALL = "#059669";
const COLOR_F1 = "#ea580c";

/**
 * 二値分類の評価指標 操作ラボ(描画層/Control層)。
 * 「陽性らしさスコアを出す、既に学習済みの固定分類器」に対する予測確率スコアの分布
 * (陽性=青・陰性=赤の2つのヒストグラム)。しきい値スライダーを動かすと混同行列
 * (TP/FP/FN/TN)が実時間更新され、同時にROC曲線上の現在の点(FPR,TPR)がハイライトされ、
 * precision/recall/F1の数式が該当する値で連動する(Issue #82 中核可視化)。
 * 操作値はuseBinaryClassificationMetricsStoreがsingle source of truth。
 */
export function ScoreLab() {
  const threshold = useBinaryClassificationMetricsStore((s) => s.controls.threshold);
  const d = useBinaryClassificationMetricsStore((s) => s.derived);
  const setControl = useBinaryClassificationMetricsStore((s) => s.setControl);

  const mathRefAcc = useRef<MathFormulaHandle>(null);
  const mathRefPrec = useRef<MathFormulaHandle>(null);
  const mathRefRecall = useRef<MathFormulaHandle>(null);
  const mathRefF1 = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefAcc.current;
    if (!m) return;
    const total = d.counts.tp + d.counts.fp + d.counts.tn + d.counts.fn;
    m.setValue("acc_tp", String(d.counts.tp));
    m.setValue("acc_tn", String(d.counts.tn));
    m.setValue("acc_n", String(total));
    m.setValue("acc_val", formatNumber(d.accuracy, 3));
    m.setHighlight("acc_tp", true, COLOR_ACC);
    m.setHighlight("acc_tn", true, COLOR_ACC);
    m.setHighlight("acc_val", true, COLOR_ACC);
  }, [d.counts, d.accuracy]);

  useEffect(() => {
    const m = mathRefPrec.current;
    if (!m) return;
    m.setValue("prec_tp_num", String(d.counts.tp));
    m.setValue("prec_tp_den", String(d.counts.tp));
    m.setValue("prec_fp", String(d.counts.fp));
    m.setValue("prec_val", d.precision === null ? "\\text{定義不可}" : formatNumber(d.precision, 3));
    m.setHighlight("prec_tp_num", true, COLOR_PREC);
    m.setHighlight("prec_tp_den", true, COLOR_PREC);
    m.setHighlight("prec_val", true, COLOR_PREC);
  }, [d.counts, d.precision]);

  useEffect(() => {
    const m = mathRefRecall.current;
    if (!m) return;
    m.setValue("rec_tp_num", String(d.counts.tp));
    m.setValue("rec_tp_den", String(d.counts.tp));
    m.setValue("rec_fn", String(d.counts.fn));
    m.setValue("rec_val", d.recall === null ? "\\text{定義不可}" : formatNumber(d.recall, 3));
    m.setHighlight("rec_tp_num", true, COLOR_RECALL);
    m.setHighlight("rec_tp_den", true, COLOR_RECALL);
    m.setHighlight("rec_val", true, COLOR_RECALL);
  }, [d.counts, d.recall]);

  useEffect(() => {
    const m = mathRefF1.current;
    if (!m) return;
    const p = d.precision;
    const r = d.recall;
    m.setValue("f1_p_num", p === null ? "?" : formatNumber(p, 2));
    m.setValue("f1_r_num", r === null ? "?" : formatNumber(r, 2));
    m.setValue("f1_p_den", p === null ? "?" : formatNumber(p, 2));
    m.setValue("f1_r_den", r === null ? "?" : formatNumber(r, 2));
    m.setValue("f1_val", d.f1 === null ? "\\text{定義不可}" : formatNumber(d.f1, 3));
    m.setHighlight("f1_val", true, COLOR_F1);
  }, [d.precision, d.recall, d.f1]);

  const thresholdX = round2(HPAD.left + threshold * HCW);
  const binW = HCW / BINS.length;
  const subW = binW / 2 - 2;

  return (
    <div id="binary-classification-metrics-lab" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        「陽性らしさスコア」を出す、既に学習済みの固定分類器。<strong>陽性(青)</strong>・<strong>陰性(赤)</strong>
        それぞれの実際のサンプルがどんなスコアを出しているかのヒストグラム。しきい値を動かすと、そのスコア以上を「陽性と予測」に変え、混同行列とprecision・recall・F1が実時間で更新される。
      </p>

      <div className="space-y-1">
        <label htmlFor="bcm-threshold" className="font-mono text-xs font-semibold text-slate-700">
          しきい値 = {formatNumber(threshold, 2)}
        </label>
        <input
          id="bcm-threshold"
          type="range"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={THRESHOLD_STEP}
          value={threshold}
          onChange={(e) => setControl("threshold", Number(e.target.value))}
          className="w-full accent-slate-900"
          aria-label="分類しきい値"
          data-testid="threshold-slider"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_170px]">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${HW} ${HH}`} className="mx-auto w-full max-w-md" role="img" aria-label="陽性・陰性それぞれのスコア分布ヒストグラム">
            <line x1={HPAD.left} y1={HH - HPAD.bottom} x2={HW - HPAD.right} y2={HH - HPAD.bottom} stroke="#cbd5e1" />
            {BINS.map((b, i) => {
              const x0 = HPAD.left + i * binW;
              const posH = round2((b.posCount / MAX_COUNT) * HCH);
              const negH = round2((b.negCount / MAX_COUNT) * HCH);
              return (
                <g key={i}>
                  <rect
                    x={round2(x0 + 1)}
                    y={round2(HH - HPAD.bottom - posH)}
                    width={round2(subW)}
                    height={posH}
                    fill={COLOR_POS}
                    opacity={0.8}
                  />
                  <rect
                    x={round2(x0 + subW + 2)}
                    y={round2(HH - HPAD.bottom - negH)}
                    width={round2(subW)}
                    height={negH}
                    fill={COLOR_NEG}
                    opacity={0.8}
                  />
                </g>
              );
            })}
            <line
              x1={thresholdX}
              y1={HPAD.top}
              x2={thresholdX}
              y2={HH - HPAD.bottom}
              stroke="#0f172a"
              strokeWidth={2}
              strokeDasharray="4 2"
              data-testid="threshold-line"
            />
            <text x={HPAD.left} y={HH - 4} className="fill-slate-400 text-[9px]">
              スコア0
            </text>
            <text x={HW - HPAD.right} y={HH - 4} textAnchor="end" className="fill-slate-400 text-[9px]">
              スコア1
            </text>
          </svg>
        </div>

        <div className="overflow-x-auto">
          <p className="mb-1 text-center text-[10px] text-slate-500">ROC曲線上の現在地(FPR,TPR)</p>
          <svg viewBox={`0 0 ${RW} ${RH}`} className="mx-auto w-full max-w-[170px]" role="img" aria-label="ROC曲線と現在のしきい値の位置">
            <line x1={RPAD.left} y1={RH - RPAD.bottom} x2={RW - RPAD.right} y2={RH - RPAD.bottom} stroke="#cbd5e1" />
            <line x1={RPAD.left} y1={RPAD.top} x2={RPAD.left} y2={RH - RPAD.bottom} stroke="#cbd5e1" />
            <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke="#e2e8f0" strokeDasharray="2 2" />
            <polyline points={ROC_PATH} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
            <circle
              cx={rx(d.fpr)}
              cy={ry(d.tpr)}
              r={5}
              fill="#dc2626"
              stroke="#fff"
              strokeWidth={1.5}
              data-testid="roc-current-point"
            />
            <text x={RPAD.left} y={RH - 4} className="fill-slate-400 text-[8px]">
              FPR→
            </text>
            <text x={4} y={RPAD.top + 4} className="fill-slate-400 text-[8px]">
              TPR↑
            </text>
          </svg>
          <p className="text-center text-[10px] text-slate-500">AUC(全体)={formatNumber(AUC_VALUE, 3)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-sm border-collapse text-center text-xs" data-testid="confusion-matrix">
          <thead>
            <tr>
              <th className="p-1" />
              <th className="p-1 font-medium text-slate-500">予測: 陽性</th>
              <th className="p-1 font-medium text-slate-500">予測: 陰性</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="p-1 font-medium text-slate-500">実際: 陽性</th>
              <td className="rounded-lg bg-blue-50 p-2 font-mono font-semibold text-blue-700">TP={d.counts.tp}</td>
              <td className="rounded-lg bg-amber-50 p-2 font-mono font-semibold text-amber-700">FN={d.counts.fn}</td>
            </tr>
            <tr>
              <th className="p-1 font-medium text-slate-500">実際: 陰性</th>
              <td className="rounded-lg bg-red-50 p-2 font-mono font-semibold text-red-700">FP={d.counts.fp}</td>
              <td className="rounded-lg bg-slate-50 p-2 font-mono font-semibold text-slate-700">TN={d.counts.tn}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefAcc} tex={FORMULA_ACC} display={false} />
        </div>
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

      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <Stat label="Accuracy" value={ratio(d.accuracy)} color={COLOR_ACC} />
        <Stat label="Precision" value={pct(d.precision)} color={COLOR_PREC} />
        <Stat label="Recall" value={pct(d.recall)} color={COLOR_RECALL} />
        <Stat label="F1" value={ratio(d.f1)} color={COLOR_F1} />
      </div>

      <Callout
        title="しきい値を下げるとRecallは上がりPrecisionは下がる(トレードオフ)"
        body="しきい値を下げる(陽性判定を増やす)と、Recall(見逃しの少なさ)は単調に上がるか変わらない一方、Precision(陽性予測の的中率)は下がりやすくなる——«広く拾えば拾うほど誤検出も増える»のは直感通り。"
        note={`いまの値: Precision=${pct(d.precision)}, Recall=${pct(d.recall)}。スライダーを両端まで動かして極端な挙動(しきい値=0で全件陽性予測、しきい値=1で全件陰性予測)も確かめよう。`}
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
