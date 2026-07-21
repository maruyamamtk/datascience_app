"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, isHighlighted, StepPlayer, useFramePlayer } from "@/components/viz";
import { CLASS_LABELS, CONFUSION_MATRIX } from "@/lib/stats/multiclass-metrics";
import { useMulticlassMetricsStore } from "@/lib/store/multiclass-metrics";
import { buildOvrFrames } from "./frames";

const FORMULA_MACRO = `\\mathrm{Macro\\ F_1}=\\dfrac{1}{K}\\sum_k F_{1,k}=${term("ovr_macro_val", "?")}`;
const FORMULA_MICRO = `\\mathrm{Micro\\ F_1}=\\dfrac{2\\Sigma TP}{2\\Sigma TP+\\Sigma FP+\\Sigma FN}=${term(
  "ovr_micro_val",
  "?",
)}`;
const FORMULA_WEIGHTED = `\\mathrm{Weighted\\ F_1}=\\sum_k \\dfrac{n_k}{N} F_{1,k}=${term("ovr_weighted_val", "?")}`;

const BW = 260;
const BH = 90;
const BAR_H = 18;
const BAR_GAP = 10;

/**
 * OvrStepper(Level1): K個のクラスをスコア順ではなく定義順に1クラスずつコマ送りし、
 * One-vs-Rest分解でTP/FP/FN/precision/recall/F1の表を少しずつ埋めていき、
 * 最後にMacro/Micro/Weighted平均を数式付きでまとめて見せる(Issue #83 中核可視化)。
 * ステッパーは1つだけなのでメインストアのframeを共用する(tasks/lessons.md #76の判断目安)。
 */
export function OvrStepper() {
  const index = useMulticlassMetricsStore((s) => s.frame.index);
  const count = useMulticlassMetricsStore((s) => s.frame.count);
  const playing = useMulticlassMetricsStore((s) => s.frame.playing);
  const nextFrame = useMulticlassMetricsStore((s) => s.nextFrame);
  const prevFrame = useMulticlassMetricsStore((s) => s.prevFrame);
  const goToFrame = useMulticlassMetricsStore((s) => s.goToFrame);
  const setPlaying = useMulticlassMetricsStore((s) => s.setPlaying);

  const frames = useMemo(() => buildOvrFrames(CONFUSION_MATRIX, CLASS_LABELS), []);
  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRefMacro = useRef<MathFormulaHandle>(null);
  const mathRefMicro = useRef<MathFormulaHandle>(null);
  const mathRefWeighted = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const macro = mathRefMacro.current;
    const micro = mathRefMicro.current;
    const weighted = mathRefWeighted.current;
    const isSummary = p?.step === "summary";
    if (macro) {
      macro.setValue("ovr_macro_val", isSummary && p?.macro?.f1 !== null ? formatNumber(p!.macro!.f1!, 3) : "?");
      macro.setHighlight("ovr_macro_val", isSummary, "#7c3aed");
    }
    if (micro) {
      micro.setValue("ovr_micro_val", isSummary && p?.micro?.f1 !== null ? formatNumber(p!.micro!.f1!, 3) : "?");
      micro.setHighlight("ovr_micro_val", isSummary, "#059669");
    }
    if (weighted) {
      weighted.setValue(
        "ovr_weighted_val",
        isSummary && p?.weighted?.f1 !== null ? formatNumber(p!.weighted!.f1!, 3) : "?",
      );
      weighted.setHighlight("ovr_weighted_val", isSummary, "#ea580c");
    }
  }, [p]);

  if (!p) return null;

  const revealedIndices = new Set(p.revealed.map((c) => c.index));

  return (
    <div
      id="multiclass-metrics-ovr-stepper"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-700">
        クラスを1つずつOne-vs-Restに切り出しながら、precision・recall・F1の表を組み立てる
      </p>

      <div className="overflow-x-auto">
        <table className="mx-auto w-full max-w-lg border-collapse text-center text-xs" data-testid="ovr-stepper-table">
          <thead>
            <tr className="text-slate-500">
              <th className="p-1 text-left">クラス</th>
              <th className="p-1">support</th>
              <th className="p-1">TP</th>
              <th className="p-1">FP</th>
              <th className="p-1">FN</th>
              <th className="p-1">Precision</th>
              <th className="p-1">Recall</th>
              <th className="p-1">F1</th>
            </tr>
          </thead>
          <tbody>
            {p.all.map((c) => {
              const revealed = revealedIndices.has(c.index);
              const isCurrent = p.step === "class" && p.current?.index === c.index;
              return (
                <tr
                  key={c.label}
                  data-testid={`ovr-row-${c.index}`}
                  className={isCurrent || isHighlighted(frame, `ovr-class-${c.index}`) ? "bg-blue-50 font-semibold" : ""}
                >
                  <td className="p-1 text-left font-medium text-slate-700">{c.label}</td>
                  <td className="p-1 font-mono">{revealed ? c.support : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? c.counts.tp : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? c.counts.fp : "—"}</td>
                  <td className="p-1 font-mono">{revealed ? c.counts.fn : "—"}</td>
                  <td className="p-1 font-mono">{revealed && c.precision !== null ? formatNumber(c.precision, 3) : "—"}</td>
                  <td className="p-1 font-mono">{revealed && c.recall !== null ? formatNumber(c.recall, 3) : "—"}</td>
                  <td className="p-1 font-mono">{revealed && c.f1 !== null ? formatNumber(c.f1, 3) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {p.step === "summary" && p.macro && p.micro && p.weighted ? (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${BW} ${BH}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Macro・Micro・WeightedのF1比較">
            {(
              [
                { name: "Macro", value: p.macro.f1 ?? 0, color: "#7c3aed" },
                { name: "Micro", value: p.micro.f1 ?? 0, color: "#059669" },
                { name: "Weighted", value: p.weighted.f1 ?? 0, color: "#ea580c" },
              ] as const
            ).map((bar, i) => {
              const y = 6 + i * (BAR_H + BAR_GAP);
              const w = Math.round(bar.value * (BW - 90) * 100) / 100;
              return (
                <g key={bar.name}>
                  <text x={0} y={y + BAR_H / 2 + 4} className="fill-slate-600 text-[10px]">
                    {bar.name}
                  </text>
                  <rect x={70} y={y} width={w} height={BAR_H} fill={bar.color} rx={3} data-testid={`ovr-bar-${bar.name.toLowerCase()}`} />
                  <text x={76 + w} y={y + BAR_H / 2 + 4} className="fill-slate-700 text-[10px]">
                    {formatNumber(bar.value, 3)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
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
        labels={["全体像", ...CLASS_LABELS.map((label) => label), "まとめ"]}
      />
    </div>
  );
}
