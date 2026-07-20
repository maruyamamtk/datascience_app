"use client";

import { useEffect, useMemo, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout, frameAt, isHighlighted, StepPlayer, useFramePlayer } from "@/components/viz";
import { MODEL, useRegressionMetricsStore, Y_DRAG_MAX, Y_DRAG_MIN } from "@/lib/store/regression-metrics";
import { round2 } from "./format";
import { buildMetricsFrames } from "./frames";

const FORMULA_MAE = `\\mathrm{MAE}=\\dfrac1n\\sum|y_i-\\hat y_i|=${term("maeval", "?")}`;
const FORMULA_MSE = `\\mathrm{MSE}=\\dfrac1n\\sum(y_i-\\hat y_i)^2=${term("mseval", "?")},\\ \\mathrm{RMSE}=${term("rmseval", "?")}`;
const FORMULA_MAPE = `\\mathrm{MAPE}=\\dfrac{100}{n}\\sum\\left|\\dfrac{y_i-\\hat y_i}{y_i}\\right|=${term("mapeval", "?")}\\%`;
const FORMULA_RMSLE = `\\mathrm{RMSLE}=\\sqrt{\\dfrac1n\\sum(\\log(1+\\hat y_i)-\\log(1+y_i))^2}=${term("rmsleval", "?")}`;

const X_MIN = 0;
const X_MAX = 42;
const Y_MIN = Y_DRAG_MIN;
const Y_MAX = Y_DRAG_MAX;
const W = 320;
const H = 180;
const PAD = { top: 10, right: 10, bottom: 10, left: 10 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

/**
 * MetricsStepper(Level1): n個の観測点を1点ずつコマ送りし、その点までの
 * MAE・MSE(RMSE)・MAPE・RMSLEが少しずつ積み上がっていく様子を見せる(Issue #81)。
 * ステッパーは1つだけなのでメインストアの frame を共用する(tasks/lessons.md #76 の判断目安)。
 */
export function MetricsStepper() {
  const index = useRegressionMetricsStore((s) => s.frame.index);
  const count = useRegressionMetricsStore((s) => s.frame.count);
  const playing = useRegressionMetricsStore((s) => s.frame.playing);
  const nextFrame = useRegressionMetricsStore((s) => s.nextFrame);
  const prevFrame = useRegressionMetricsStore((s) => s.prevFrame);
  const goToFrame = useRegressionMetricsStore((s) => s.goToFrame);
  const setPlaying = useRegressionMetricsStore((s) => s.setPlaying);
  const points = useRegressionMetricsStore((s) => s.controls.points);

  const frames = useMemo(() => buildMetricsFrames(points, MODEL), [points]);
  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1600 });

  const frame = frameAt(frames, index);
  const p = frame?.payload;

  const mathRefMae = useRef<MathFormulaHandle>(null);
  const mathRefMse = useRef<MathFormulaHandle>(null);
  const mathRefMape = useRef<MathFormulaHandle>(null);
  const mathRefRmsle = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    if (!p) return;
    const metrics = p.step === "summary" ? p.finalMetrics : p.runningMetrics;
    const m1 = mathRefMae.current;
    if (m1) {
      m1.setValue("maeval", metrics?.mae !== undefined ? formatNumber(metrics.mae) : "?");
      m1.setHighlight("maeval", true, "#2563eb");
    }
    const m2 = mathRefMse.current;
    if (m2) {
      m2.setValue("mseval", metrics?.mse !== undefined ? formatNumber(metrics.mse) : "?");
      m2.setValue("rmseval", metrics?.rmse !== undefined ? formatNumber(metrics.rmse) : "?");
      m2.setHighlight("mseval", true, "#dc2626");
      m2.setHighlight("rmseval", true, "#ea580c");
    }
    const m3 = mathRefMape.current;
    if (m3) {
      m3.setValue("mapeval", metrics?.mape !== undefined ? formatNumber(metrics.mape) : "?");
      m3.setHighlight("mapeval", true, "#7c3aed");
    }
    const m4 = mathRefRmsle.current;
    if (m4) {
      m4.setValue("rmsleval", metrics?.rmsle !== undefined ? formatNumber(metrics.rmsle) : "?");
      m4.setHighlight("rmsleval", true, "#0d9488");
    }
  }, [p]);

  const toX = (x: number) => round2(PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * CHART_W);
  const toY = (y: number) => round2(PAD.top + (1 - (Math.max(Y_MIN, Math.min(Y_MAX, y)) - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H);

  return (
    <div id="regression-metrics-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">観測点を1つずつ確認しながら、5つの評価指標を積み上げて計算する</p>

      {p ? (
        <>
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-sm" role="img" aria-label="観測点と現在注目している点">
              <line
                x1={toX(X_MIN)}
                y1={toY(MODEL.slope * X_MIN + MODEL.intercept)}
                x2={toX(X_MAX)}
                y2={toY(MODEL.slope * X_MAX + MODEL.intercept)}
                stroke="#334155"
                strokeWidth={2}
              />
              {p.points.map((pt, i) => {
                const active = isHighlighted(frame, `point-${i}`);
                const processed = p.step === "summary" || (p.pointIndex !== undefined && i <= p.pointIndex);
                const predicted = MODEL.slope * pt.x + MODEL.intercept;
                return (
                  <g key={i}>
                    {processed ? (
                      <line
                        x1={toX(pt.x)}
                        y1={toY(pt.y)}
                        x2={toX(pt.x)}
                        y2={toY(predicted)}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                      />
                    ) : null}
                    <circle
                      cx={toX(pt.x)}
                      cy={toY(pt.y)}
                      r={active ? 7 : 5}
                      fill={processed ? "#fff" : "#e2e8f0"}
                      stroke={active ? "#dc2626" : processed ? "#1e293b" : "#94a3b8"}
                      strokeWidth={active ? 3 : 1.5}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-center">
              <MathFormula ref={mathRefMae} tex={FORMULA_MAE} display={false} />
            </div>
            <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-center">
              <MathFormula ref={mathRefMse} tex={FORMULA_MSE} display={false} />
            </div>
            <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-center">
              <MathFormula ref={mathRefMape} tex={FORMULA_MAPE} display={false} />
            </div>
            <div className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-center">
              <MathFormula ref={mathRefRmsle} tex={FORMULA_RMSLE} display={false} />
            </div>
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
        labels={["全体像", ...frames.slice(1, -1).map((_, i) => `点${i + 1}`), "まとめ"]}
      />
    </div>
  );
}
