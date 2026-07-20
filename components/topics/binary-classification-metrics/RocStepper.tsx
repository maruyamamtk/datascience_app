"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, isHighlighted, StepPlayer, useFramePlayer } from "@/components/viz";
import { SAMPLES, useBinaryClassificationMetricsStore } from "@/lib/store/binary-classification-metrics";
import { round2 } from "./format";
import { buildRocFrames } from "./frames";

const FORMULA_AUC = `\\mathrm{AUC}\\approx\\sum_i \\Delta\\mathrm{FPR}_i\\times\\overline{\\mathrm{TPR}}_i=${term("auc_val", "?")}`;

const W = 260;
const H = 260;
const PAD = { top: 10, right: 10, bottom: 24, left: 30 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const cx = (v: number) => round2(PAD.left + v * CW);
const cy = (v: number) => round2(PAD.top + (1 - v) * CH);

/**
 * RocStepper(Level1): n件のサンプルをスコアの高い順に1件ずつコマ送りし、
 * ROC曲線が(0,0)から(1,1)へ1段ずつ伸びていく様子と、AUC(台形則の累積面積)が
 * 少しずつ積み上がっていく様子を見せる(Issue #82「ROC曲線を1点ずつコマ送りで描く」)。
 * ステッパーは1つだけなのでメインストアのframeを共用する(tasks/lessons.md #76の判断目安)。
 */
export function RocStepper() {
  const index = useBinaryClassificationMetricsStore((s) => s.frame.index);
  const count = useBinaryClassificationMetricsStore((s) => s.frame.count);
  const playing = useBinaryClassificationMetricsStore((s) => s.frame.playing);
  const nextFrame = useBinaryClassificationMetricsStore((s) => s.nextFrame);
  const prevFrame = useBinaryClassificationMetricsStore((s) => s.prevFrame);
  const goToFrame = useBinaryClassificationMetricsStore((s) => s.goToFrame);
  const setPlaying = useBinaryClassificationMetricsStore((s) => s.setPlaying);

  const frames = useMemo(() => buildRocFrames(SAMPLES), []);
  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 900 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRefAuc = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefAuc.current;
    if (!m) return;
    m.setValue("auc_val", formatNumber(p?.cumulativeAuc ?? 0, 3));
    m.setHighlight("auc_val", true, "#ea580c");
  }, [p]);

  if (!p) return null;

  const revealedPath = p.points.map((pt) => `${cx(pt.fpr)},${cy(pt.tpr)}`).join(" ");
  const fullPath = p.allPoints.map((pt) => `${cx(pt.fpr)},${cy(pt.tpr)}`).join(" ");
  const current = p.points[p.points.length - 1];

  return (
    <div id="binary-classification-metrics-roc-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">サンプルをスコアの高い順に1件ずつ確認しながら、ROC曲線とAUCを積み上げて計算する</p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-xs" role="img" aria-label="ROC曲線の構築過程">
          <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#cbd5e1" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#cbd5e1" />
          <line x1={cx(0)} y1={cy(0)} x2={cx(1)} y2={cy(1)} stroke="#e2e8f0" strokeDasharray="3 3" />
          <polyline points={fullPath} fill="none" stroke="#e2e8f0" strokeWidth={2} />
          <polyline points={revealedPath} fill="none" stroke="#2563eb" strokeWidth={2.5} data-testid="roc-revealed-path" />
          {current ? (
            <circle
              cx={cx(current.fpr)}
              cy={cy(current.tpr)}
              r={isHighlighted(frame, `roc-point-${index}`) || p.step === "summary" ? 6 : 5}
              fill={p.sample?.label === 1 ? "#2563eb" : p.sample?.label === 0 ? "#dc2626" : "#334155"}
              stroke="#fff"
              strokeWidth={1.5}
              data-testid="roc-stepper-point"
            />
          ) : null}
          <text x={PAD.left} y={H - 6} className="fill-slate-400 text-[9px]">
            FPR→
          </text>
          <text x={2} y={PAD.top + 8} className="fill-slate-400 text-[9px]">
            TPR↑
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
        <MathFormula ref={mathRefAuc} tex={FORMULA_AUC} display={false} />
      </div>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
        labels={["全体像", ...SAMPLES.map((_, i) => `${i + 1}件目`), "まとめ"]}
      />
    </div>
  );
}
