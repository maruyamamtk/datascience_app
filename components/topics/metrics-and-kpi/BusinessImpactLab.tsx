"use client";

import { useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { normalizeToUnit } from "@/lib/stats/metrics-and-kpi";
import {
  COST_FN_MAX,
  COST_FN_MIN,
  COST_FP_MAX,
  COST_FP_MIN,
  REVENUE_TP_MAX,
  REVENUE_TP_MIN,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  THRESHOLD_STEP,
  useMetricsKpiStore,
} from "@/lib/store/metrics-and-kpi";
import { yen } from "./format";

const FORMULA_ACC = `\\mathrm{Accuracy}=\\dfrac{TP+TN}{N}=\\dfrac{${term("tp", "?")}+${term("tn", "?")}}{${term(
  "n",
  "?",
)}}=${term("accval", "?")}`;

const FORMULA_BIZ = `\\text{期待ビジネスインパクト}=TP\\cdot r_{TP}-FP\\cdot c_{FP}-FN\\cdot c_{FN}=${term(
  "tp2",
  "?",
)}\\times${term("rtp", "?")}-${term("fp2", "?")}\\times${term("cfp", "?")}-${term("fn2", "?")}\\times${term(
  "cfn",
  "?",
)}=${term("bizval", "?")}`;

const round2 = (v: number) => Math.round(v * 100) / 100;

const W = 300;
const H = 220;
const PADL = 28;
const PADR = 10;
const PADT = 12;
const PADB = 24;
const cx = (t: number) => round2(PADL + ((t - THRESHOLD_MIN) / (THRESHOLD_MAX - THRESHOLD_MIN)) * (W - PADL - PADR));
const cy = (v: number) => round2(PADT + (1 - Math.max(0, Math.min(1, v))) * (H - PADT - PADB));

/**
 * 技術指標（正解率）とビジネスKPI（期待ビジネスインパクト）の乖離ラボ（Level0/1）。
 * しきい値・コスト行列（revenueTP/costFP/costFN）を動かすと、正解率カーブと
 * 期待ビジネスインパクトカーブが異なるしきい値で最大化されることを可視化と数式で示す。
 */
export function BusinessImpactLab() {
  const controls = useMetricsKpiStore((s) => s.controls);
  const d = useMetricsKpiStore((s) => s.derived);
  const setControl = useMetricsKpiStore((s) => s.setControl);

  const mathRefAcc = useRef<MathFormulaHandle>(null);
  const mathRefBiz = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefAcc.current;
    if (!m) return;
    m.setValue("tp", String(d.confusion.tp));
    m.setValue("tn", String(d.confusion.tn));
    m.setValue("n", String(d.confusion.tp + d.confusion.fp + d.confusion.tn + d.confusion.fn));
    m.setValue("accval", formatNumber(d.accuracy, 3));
    m.setHighlight("tp", true, "#2563eb");
    m.setHighlight("tn", true, "#2563eb");
    m.setHighlight("accval", true, "#2563eb");
  }, [d.confusion, d.accuracy]);

  useEffect(() => {
    const m = mathRefBiz.current;
    if (!m) return;
    m.setValue("tp2", String(d.confusion.tp));
    m.setValue("rtp", String(d.revenueTP));
    m.setValue("fp2", String(d.confusion.fp));
    m.setValue("cfp", String(d.costFP));
    m.setValue("fn2", String(d.confusion.fn));
    m.setValue("cfn", String(d.costFN));
    m.setValue("bizval", yen(d.businessValue));
    m.setHighlight("tp2", true, "#059669");
    m.setHighlight("rtp", true, "#059669");
    m.setHighlight("fp2", true, "#dc2626");
    m.setHighlight("cfp", true, "#dc2626");
    m.setHighlight("fn2", true, "#d97706");
    m.setHighlight("cfn", true, "#d97706");
    m.setHighlight("bizval", true, "#059669");
  }, [d.confusion, d.revenueTP, d.costFP, d.costFN, d.businessValue]);

  const accPts = d.curve.map((p) => `${cx(p.threshold)},${cy(p.accuracy)}`).join(" ");
  const bizNorm = normalizeToUnit(d.curve.map((p) => p.businessValue));
  const bizPts = d.curve.map((p, i) => `${cx(p.threshold)},${cy(bizNorm[i])}`).join(" ");

  return (
    <div id="business-impact-lab" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        休眠ユーザーへのクーポン施策——«陽性らしさスコア» に対する送付しきい値を動かすと、
        技術指標（正解率, 青）とビジネスKPI（期待ビジネスインパクト, 緑・正規化表示）が
        <strong> 別のしきい値で最大化される</strong>ことを確かめよう。TP=送って買った、FP=送ったが買わなかった（無駄コスト）、FN=送らなかったが本当は買った（機会損失）。
      </p>

      <div className="space-y-1">
        <label htmlFor="mk-threshold" className="font-mono text-xs font-semibold text-slate-700">
          しきい値 θ = {formatNumber(controls.threshold, 3)}
        </label>
        <input
          id="mk-threshold"
          type="range"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={THRESHOLD_STEP}
          value={controls.threshold}
          onChange={(e) => setControl("threshold", Number(e.target.value))}
          className="w-full accent-slate-900"
          aria-label="分類しきい値"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          <span>
            TP純利益 r_TP = <span className="font-mono">{yen(controls.revenueTP)}</span>
          </span>
          <input
            type="range"
            min={REVENUE_TP_MIN}
            max={REVENUE_TP_MAX}
            step={500}
            value={controls.revenueTP}
            onChange={(e) => setControl("revenueTP", Number(e.target.value))}
            className="accent-emerald-600"
            aria-label="TPの純利益"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          <span>
            FP無駄コスト c_FP = <span className="font-mono">{yen(controls.costFP)}</span>
          </span>
          <input
            type="range"
            min={COST_FP_MIN}
            max={COST_FP_MAX}
            step={100}
            value={controls.costFP}
            onChange={(e) => setControl("costFP", Number(e.target.value))}
            className="accent-red-600"
            aria-label="FPの無駄コスト"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          <span>
            FN機会損失 c_FN = <span className="font-mono">{yen(controls.costFN)}</span>
          </span>
          <input
            type="range"
            min={COST_FN_MIN}
            max={COST_FN_MAX}
            step={500}
            value={controls.costFN}
            onChange={(e) => setControl("costFN", Number(e.target.value))}
            className="accent-amber-600"
            aria-label="FNの機会損失"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label="しきい値に対する正解率と期待ビジネスインパクト（正規化）">
          {[0, 0.5, 1].map((v) => (
            <g key={`g${v}`}>
              <line x1={PADL} y1={cy(v)} x2={W - PADR} y2={cy(v)} className="stroke-slate-100" />
              <text x={PADL - 4} y={cy(v) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">
                {v}
              </text>
            </g>
          ))}
          {/* 正解率が最大になるしきい値（青破線） */}
          <line x1={cx(d.bestAccuracyThreshold)} y1={PADT} x2={cx(d.bestAccuracyThreshold)} y2={H - PADB} className="stroke-blue-300" strokeDasharray="3 3" />
          {/* ビジネスインパクトが最大になるしきい値（緑破線） */}
          <line x1={cx(d.bestBusinessThreshold)} y1={PADT} x2={cx(d.bestBusinessThreshold)} y2={H - PADB} className="stroke-emerald-400" strokeDasharray="3 3" />
          {/* 現在のしきい値（実線） */}
          <line x1={cx(controls.threshold)} y1={PADT} x2={cx(controls.threshold)} y2={H - PADB} className="stroke-slate-500" strokeWidth={1.6} />

          <polyline points={accPts} fill="none" className="stroke-blue-600" strokeWidth={2} />
          <polyline points={bizPts} fill="none" className="stroke-emerald-600" strokeWidth={2} />

          <text x={(PADL + W - PADR) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[9px]">
            しきい値 θ →　青=正解率, 緑=期待ビジネスインパクト（正規化）
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRefAcc} tex={FORMULA_ACC} display={false} />
      </div>
      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRefBiz} tex={FORMULA_BIZ} display={false} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="現在の正解率" value={formatNumber(d.accuracy, 3)} />
        <Stat label="現在の期待利益" value={yen(d.businessValue)} />
        <Stat label="正解率最大のθ" value={formatNumber(d.bestAccuracyThreshold, 3)} tone="blue" />
        <Stat label="利益最大のθ" value={formatNumber(d.bestBusinessThreshold, 3)} tone="emerald" />
      </div>

      <Callout
        title={d.thresholdsDiverge ? "正解率が最大のしきい値と、利益が最大のしきい値はズレている" : "現在のコスト設定では2つのしきい値が一致している"}
        body={
          d.thresholdsDiverge
            ? `正解率だけを見れば θ=${formatNumber(d.bestAccuracyThreshold, 3)}（正解率${formatNumber(d.bestAccuracy, 3)}）が最良に見えるが、コスト行列を反映した期待ビジネスインパクトは θ=${formatNumber(d.bestBusinessThreshold, 3)} のとき最大の${yen(d.bestBusinessValue)}になる。«技術指標を上げてもビジネス指標が上がるとは限らない»——評価指標をKPIに連動させて設計しないと、見た目の精度に釣られて損をするしきい値を選んでしまう。`
            : "偽陽性・偽陰性のコストと純利益のバランスがちょうど釣り合っており、正解率の最大化がそのまま期待利益の最大化にもなっている——実務ではこの一致はむしろ稀。"
        }
        note="この乖離は «自己無自覚なモデル改善»（正解率などの技術指標だけを磨いても、ビジネス成果に繋がらない改善）の典型例。データサイエンティストは技術指標の最適化で終わらず、コスト・収益を反映したKPIで意思決定する必要がある。"
        kind="explain"
      />
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "blue" | "emerald" }) {
  const bg = { slate: "bg-slate-50 text-slate-900", blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700" }[tone];
  return (
    <div className={`rounded-lg px-2 py-2 text-center ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
