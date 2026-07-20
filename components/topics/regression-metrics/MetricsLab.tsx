"use client";

import { useCallback, useEffect, useRef } from "react";
import { MathFormula, type MathFormulaHandle } from "@/components/math/MathFormula";
import { formatNumber, term } from "@/components/math/tex";
import { Callout } from "@/components/viz";
import { makeOutlier, type MetricSet } from "@/lib/stats/regression-metrics";
import {
  INITIAL_POINTS,
  MODEL,
  OUTLIER_DELTA_Y,
  OUTLIER_INDEX,
  useRegressionMetricsStore,
  Y_DRAG_MAX,
  Y_DRAG_MIN,
} from "@/lib/store/regression-metrics";
import { people } from "./format";

const FORMULA_MAE = `\\mathrm{MAE}=\\dfrac1n\\sum_{i=1}^n|y_i-\\hat y_i|=${term("maeval", "?")}\\ \\text{人}`;
const FORMULA_MSE = `\\mathrm{MSE}=\\dfrac1n\\sum(y_i-\\hat y_i)^2=${term("mseval", "?")},\\quad \\mathrm{RMSE}=\\sqrt{\\mathrm{MSE}}=${term(
  "rmseval",
  "?",
)}\\ \\text{人}`;
const FORMULA_MAPE = `\\mathrm{MAPE}=\\dfrac{100}{n}\\sum\\left|\\dfrac{y_i-\\hat y_i}{y_i}\\right|=${term("mapeval", "?")}\\%`;
const FORMULA_RMSLE = `\\mathrm{RMSLE}=\\sqrt{\\dfrac1n\\sum\\bigl(\\log(1+\\hat y_i)-\\log(1+y_i)\\bigr)^2}=${term("rmsleval", "?")}`;

const round2 = (v: number) => Math.round(v * 100) / 100;

// チャート座標系(データ座標とは別に、見やすいマージンを取った表示専用ドメイン)。
const X_MIN = 0;
const X_MAX = 42;
const Y_MIN = 0;
const Y_MAX = Y_DRAG_MAX;

const W = 380;
const H = 260;
const PAD = { top: 14, right: 14, bottom: 28, left: 32 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

const COLOR_MODEL = "#334155"; // 固定モデル(既に学習済みの直線)
const COLOR_RESIDUAL = "#f59e0b"; // 残差縦線
const COLOR_OUTLIER = "#dc2626";
const COLOR_MAE = "#2563eb";
const COLOR_MSE = "#dc2626";
const COLOR_RMSE = "#ea580c";
const COLOR_MAPE = "#7c3aed";
const COLOR_RMSLE = "#0d9488";

const METRIC_COLOR: Record<keyof MetricSet, string> = {
  mae: COLOR_MAE,
  mse: COLOR_MSE,
  rmse: COLOR_RMSE,
  mape: COLOR_MAPE,
  rmsle: COLOR_RMSLE,
};
const METRIC_LABEL: Record<keyof MetricSet, string> = {
  mae: "MAE",
  mse: "MSE",
  rmse: "RMSE",
  mape: "MAPE",
  rmsle: "RMSLE",
};

/**
 * 回帰の評価指標 操作ラボ(描画層 / Control 層)。
 * 「予約件数→来店者数」の既に学習済みの固定モデル(直線)に対し、実測点(白丸)を縦方向に
 * ドラッグすると、残差(橙の縦線)とMAE・MSE・RMSE・MAPE・RMSLEの5指標が実時間で再計算される。
 * 「外れ値を作る」ボタンで1点を大きく動かすと、baselineに対する比率バーでMSE/RMSEだけが
 * 大きく伸びる一方MAEはあまり伸びないことを確認できる(Issue #81 中核可視化)。
 * 操作値は useRegressionMetricsStore が single source of truth。
 */
export function MetricsLab() {
  const points = useRegressionMetricsStore((s) => s.controls.points);
  const { errors, metrics, ratios } = useRegressionMetricsStore((s) => s.derived);
  const setControl = useRegressionMetricsStore((s) => s.setControl);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<number | null>(null);

  const mathRefMae = useRef<MathFormulaHandle>(null);
  const mathRefMse = useRef<MathFormulaHandle>(null);
  const mathRefMape = useRef<MathFormulaHandle>(null);
  const mathRefRmsle = useRef<MathFormulaHandle>(null);

  useEffect(() => {
    const m = mathRefMae.current;
    if (!m) return;
    m.setValue("maeval", formatNumber(metrics.mae));
    m.setHighlight("maeval", true, COLOR_MAE);
  }, [metrics.mae]);

  useEffect(() => {
    const m = mathRefMse.current;
    if (!m) return;
    m.setValue("mseval", formatNumber(metrics.mse));
    m.setValue("rmseval", formatNumber(metrics.rmse));
    m.setHighlight("mseval", true, COLOR_MSE);
    m.setHighlight("rmseval", true, COLOR_RMSE);
  }, [metrics.mse, metrics.rmse]);

  useEffect(() => {
    const m = mathRefMape.current;
    if (!m) return;
    m.setValue("mapeval", formatNumber(metrics.mape));
    m.setHighlight("mapeval", true, COLOR_MAPE);
  }, [metrics.mape]);

  useEffect(() => {
    const m = mathRefRmsle.current;
    if (!m) return;
    m.setValue("rmsleval", formatNumber(metrics.rmsle));
    m.setHighlight("rmsleval", true, COLOR_RMSLE);
  }, [metrics.rmsle]);

  const toX = (x: number) => round2(PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * CHART_W);
  const toY = (y: number) => round2(PAD.top + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H);

  const toDataY = useCallback((clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vbY = ((clientY - rect.top) / rect.height) * H;
    const y = Y_MIN + (1 - (vbY - PAD.top) / CHART_H) * (Y_MAX - Y_MIN);
    return Math.max(Y_DRAG_MIN, Math.min(Y_DRAG_MAX, y));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const i = dragRef.current;
      if (i === null) return;
      const y = toDataY(e.clientY);
      if (y === null) return;
      const next = points.map((p, idx) => (idx === i ? { ...p, y: Math.round(y * 10) / 10 } : p));
      setControl("points", next);
    },
    [points, setControl, toDataY],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture が無い場合は無視。
    }
  }, []);

  const makeOutlierClick = () => {
    setControl("points", makeOutlier(points, OUTLIER_INDEX, OUTLIER_DELTA_Y));
  };
  const resetClick = () => {
    setControl("points", INITIAL_POINTS);
  };

  const metricKeys: (keyof MetricSet)[] = ["mae", "mse", "rmse", "mape", "rmsle"];
  const ratioValues = metricKeys.map((k) => ratios[k] ?? 0);
  const barScaleMax = Math.max(2, ...ratioValues);
  const barW = 40;
  const barGap = 16;
  const BAR_H = 260;
  const BAR_W = 380;
  const barChartTop = 14;
  const barChartBottom = 34;
  const barAreaH = BAR_H - barChartTop - barChartBottom;
  const barX0 = (BAR_W - metricKeys.length * barW - (metricKeys.length - 1) * barGap) / 2;

  return (
    <div id="regression-metrics-lab" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        「予約件数から来店者数を予測する、既に学習済みのモデル」(灰色の直線)に対する実測点(白丸)。点を縦にドラッグして動かすと、残差(橙の縦線)と5つの評価指標が実時間で再計算される。
        <strong> 「外れ値を作る」</strong>を押して1点を大きくずらし、MAE・MSE・RMSE・MAPE・RMSLEのどれが最も敏感に反応するか確かめよう。
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="散布図と固定モデル直線・残差"
        data-testid="metrics-plot"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <line x1={toX(X_MIN)} y1={toY(Y_MIN)} x2={toX(X_MAX)} y2={toY(Y_MIN)} stroke="#cbd5e1" />
        <line x1={toX(X_MIN)} y1={toY(Y_MIN)} x2={toX(X_MIN)} y2={toY(Y_MAX)} stroke="#cbd5e1" />
        <text x={toX(X_MAX)} y={toY(Y_MIN) + 18} textAnchor="end" className="fill-slate-400 text-[10px]">
          予約件数
        </text>
        <text x={toX(X_MIN)} y={PAD.top - 4} textAnchor="start" className="fill-slate-400 text-[10px]">
          来店者数
        </text>

        {/* 固定モデルの予測直線(既に学習済み、常に固定) */}
        <line
          x1={toX(X_MIN)}
          y1={toY(MODEL.slope * X_MIN + MODEL.intercept)}
          x2={toX(X_MAX)}
          y2={toY(MODEL.slope * X_MAX + MODEL.intercept)}
          stroke={COLOR_MODEL}
          strokeWidth={2}
        />

        {/* 残差縦線 */}
        {errors.map((e, i) => (
          <line
            key={`r${i}`}
            x1={toX(e.x)}
            y1={toY(e.actual)}
            x2={toX(e.x)}
            y2={toY(e.predicted)}
            stroke={i === OUTLIER_INDEX && e.absError > 20 ? COLOR_OUTLIER : COLOR_RESIDUAL}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        ))}

        {/* 実測点(ドラッグ可能) */}
        {points.map((p, i) => (
          <circle
            key={`p${i}`}
            cx={toX(p.x)}
            cy={toY(Math.max(Y_MIN, Math.min(Y_MAX, p.y)))}
            r={6}
            fill="#fff"
            stroke={i === OUTLIER_INDEX && errors[i]?.absError > 20 ? COLOR_OUTLIER : "#1e293b"}
            strokeWidth={2}
            className="cursor-grab"
            data-testid={`metrics-point-${i}`}
            onPointerDown={(e) => {
              dragRef.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
          />
        ))}
      </svg>

      <p className="text-center text-xs text-slate-500">点を上下にドラッグできます(モデルの直線は固定)。</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={makeOutlierClick}
          className="rounded-lg border border-red-500 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
          data-testid="make-outlier-btn"
        >
          外れ値を作る(1点を大きくずらす)
        </button>
        <button
          type="button"
          onClick={resetClick}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          data-testid="reset-points-btn"
        >
          初期データに戻す
        </button>
      </div>

      {/* 5指標の数式(強連動) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefMae} tex={FORMULA_MAE} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefMse} tex={FORMULA_MSE} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefMape} tex={FORMULA_MAPE} display={false} />
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 text-center">
          <MathFormula ref={mathRefRmsle} tex={FORMULA_RMSLE} display={false} />
        </div>
      </div>

      {/* 現在値パネル */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
        <Stat label="MAE" value={people(metrics.mae)} color={COLOR_MAE} />
        <Stat label="MSE" value={formatNumber(metrics.mse)} color={COLOR_MSE} />
        <Stat label="RMSE" value={people(metrics.rmse)} color={COLOR_RMSE} />
        <Stat label="MAPE" value={`${formatNumber(metrics.mape)}%`} color={COLOR_MAPE} />
        <Stat label="RMSLE" value={formatNumber(metrics.rmsle)} color={COLOR_RMSLE} />
      </div>

      {/* 外れ値への感度比較(baseline比の倍率バー) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700">初期データ比(倍率) — 外れ値を作ると、どの指標が最も伸びるか</p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} className="mx-auto w-full max-w-md" role="img" aria-label="各指標のbaseline比バーチャート">
            <line x1={barX0} y1={BAR_H - barChartBottom} x2={BAR_W - barX0} y2={BAR_H - barChartBottom} className="stroke-slate-200" />
            {metricKeys.map((k, i) => {
              const ratio = ratios[k] ?? 0;
              const clamped = Math.min(ratio, barScaleMax);
              const barH = round2((clamped / barScaleMax) * barAreaH);
              const x = round2(barX0 + i * (barW + barGap));
              const y = round2(BAR_H - barChartBottom - barH);
              return (
                <g key={k} data-testid={`ratio-bar-${k}`}>
                  <rect x={x} y={y} width={barW} height={barH} fill={METRIC_COLOR[k]} opacity={0.85} rx={3} />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="fill-slate-700 text-[10px] font-mono">
                    ×{formatNumber(ratio, 2)}
                  </text>
                  <text x={x + barW / 2} y={BAR_H - barChartBottom + 14} textAnchor="middle" className="fill-slate-500 text-[10px]">
                    {METRIC_LABEL[k]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <Callout
        title="MSE/RMSEは二乗するぶん、外れ値に敏感"
        body={`MAEは残差の絶対値をそのまま平均するため外れ値の影響は「線形」。一方MSE(・RMSE)は残差を二乗するため、1点が大きくズレるとその点だけで二乗分の寄与が跳ね上がる。いまの比率は MAE=×${formatNumber(
          ratios.mae ?? 0,
          2,
        )}, MSE=×${formatNumber(ratios.mse ?? 0, 2)}, RMSE=×${formatNumber(ratios.rmse ?? 0, 2)}。`}
        note="MAPEは実測値に対する相対誤差なので、実測値が小さい点で1点でも大きくズレると跳ね上がりやすい。RMSLEは対数を取るぶん大きな値どうしの差を圧縮し、過小予測をより重く評価する非対称な指標。"
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
