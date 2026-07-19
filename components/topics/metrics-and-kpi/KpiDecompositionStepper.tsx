"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, Highlight, isHighlighted, StepPlayer } from "@/components/viz";
import type { FactorKey } from "@/lib/stats/metrics-and-kpi";
import { useMetricsKpiStore } from "@/lib/store/metrics-and-kpi";
import { buildKpiDecompositionFrames } from "./kpi-decomposition-frames";

const FORMULA = `\\text{売上}=${term("traffic", "?")}\\times${term("conv", "?")}\\times${term("aov", "?")}=${term(
  "revenue",
  "?",
)}`;

function yen(v: number): string {
  return `${Math.round(v).toLocaleString("ja-JP")}円`;
}

const FACTOR_TITLE: Record<FactorKey, string> = {
  traffic: "トラフィック",
  conversionRate: "転換率",
  aov: "客単価",
};

/**
 * KPI分解ステッパー（Level2）: 売上=トラフィック×転換率×客単価という乗法分解を1要素ずつ辿り、
 * それぞれを+10%改善したときの売上インパクトを見せる。ステッパーは1つだけなので
 * メインストアの frame を共用する（tasks/lessons.md #76 の判断目安）。
 */
export function KpiDecompositionStepper() {
  const index = useMetricsKpiStore((s) => s.frame.index);
  const count = useMetricsKpiStore((s) => s.frame.count);
  const playing = useMetricsKpiStore((s) => s.frame.playing);
  const nextFrame = useMetricsKpiStore((s) => s.nextFrame);
  const prevFrame = useMetricsKpiStore((s) => s.prevFrame);
  const goToFrame = useMetricsKpiStore((s) => s.goToFrame);
  const setPlaying = useMetricsKpiStore((s) => s.setPlaying);

  const frames = useMemo(() => buildKpiDecompositionFrames(), []);
  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRef = useRef<MathFormulaHandle>(null);
  useEffect(() => {
    const m = mathRef.current;
    if (!m || !p) return;
    const factors = p.factor && p.after !== undefined ? { ...p.factors, [p.factor]: p.after } : p.factors;
    const revenue = p.factor ? (p.revenueAfter ?? p.baseRevenue) : p.baseRevenue;
    m.setValue("traffic", formatNumber(factors.traffic, 0));
    m.setValue("conv", formatNumber(factors.conversionRate, 4));
    m.setValue("aov", formatNumber(factors.aov, 0));
    m.setValue("revenue", yen(revenue));
    m.setHighlight("traffic", p.step === "overview" || p.step === "traffic", "#2563eb");
    m.setHighlight("conv", p.step === "overview" || p.step === "conversionRate", "#2563eb");
    m.setHighlight("aov", p.step === "overview" || p.step === "aov", "#2563eb");
    m.setHighlight("revenue", true, "#059669");
  }, [p]);

  return (
    <div id="kpi-decomposition-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">売上をトラフィック×転換率×客単価に分解し、各要素を+10%改善したときのインパクトを1つずつ見る</p>

      {p ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {(["traffic", "conversionRate", "aov"] as const).map((factorKey) => (
              <Highlight key={factorKey} active={isHighlighted(frame, factorKey)} color="#2563eb" className="rounded-lg p-2">
                <div className="font-semibold text-slate-700">{FACTOR_TITLE[factorKey]}</div>
                <div className="mt-1 font-mono text-slate-900">
                  {factorKey === "conversionRate" ? formatNumber(p.factors[factorKey], 4) : Math.round(p.factors[factorKey]).toLocaleString("ja-JP")}
                  {p.factor === factorKey ? (
                    <span className="ml-1 text-emerald-600">→ {factorKey === "conversionRate" ? formatNumber(p.after ?? 0, 4) : Math.round(p.after ?? 0).toLocaleString("ja-JP")}</span>
                  ) : null}
                </div>
              </Highlight>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
            <MathFormula ref={mathRef} tex={FORMULA} display={false} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <Stat label="現在の売上" value={yen(p.baseRevenue)} />
            <Stat label={p.factor ? `+10%改善後の売上（${FACTOR_TITLE[p.factor]}）` : "売上（変化なし）"} value={yen(p.revenueAfter ?? p.baseRevenue)} tone="emerald" />
          </div>
        </>
      ) : null}

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
        labels={["全体像", "トラフィック+10%", "転換率+10%", "客単価+10%"]}
      />
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" }) {
  const bg = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <div className="font-mono text-sm">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
