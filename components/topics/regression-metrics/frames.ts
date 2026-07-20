/**
 * MetricsStepper(Level1)の純粋なフレームビルダー。
 * n個の観測点を1点ずつコマ送りで確認しながら、MAE・MSE(RMSE)・MAPE・RMSLEを
 * 少しずつ積み上げて計算する様子を見せる(Issue #81「各点の残差を1点ずつコマ送りで
 * 可視化し、各指標がどう計算されるかを積み上げていく」)。
 *
 * フレーム構成: [overview, point(0)..point(n-1), summary] = n+2 フレーム。
 */
import type { VizFrame } from "@/components/viz";
import { type Model, type Point, type PointError, pointErrorOf, allMetricsOf, type MetricSet } from "@/lib/stats/regression-metrics";

export type MetricsStepPayload = {
  step: "overview" | "point" | "summary";
  points: Point[];
  model: Model;
  pointIndex?: number;
  error?: PointError;
  /** 処理済みの点数(overview=0, summary=points.length)。 */
  processedCount: number;
  /** ここまでの点だけで計算した指標(コマが進むごとに更新される途中経過)。 */
  runningMetrics?: Partial<MetricSet>;
  /** 全点処理後の最終指標(summaryフレームのみ)。 */
  finalMetrics?: MetricSet;
};

function meanDefined(values: readonly (number | null)[]): number {
  const defined = values.filter((v): v is number => v !== null);
  if (defined.length === 0) return Number.NaN;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
}

/**
 * points・model から MetricsStepper のフレーム列を作る純関数。
 * 各点フレームでは、その点までの部分平均(runningMetrics)を計算して「積み上げ」を表現する。
 */
export function buildMetricsFrames(points: Point[], model: Model): VizFrame<MetricsStepPayload>[] {
  const errors = points.map((p) => pointErrorOf(p, model));
  const frames: VizFrame<MetricsStepPayload>[] = [];

  frames.push({
    highlights: [],
    callout: {
      title: `${points.length}個の観測点を1つずつ見ていく`,
      body: "予約件数から来店者数を予測する、既に学習済みの固定モデルに対して、各点の残差を1つずつ確認しながらMAE・MSE(RMSE)・MAPE・RMSLEを積み上げて計算する。",
      note: "モデル(直線)はこのステッパーの間ずっと固定——単回帰トピックの「直線をどう当てはめるか」とは役割が違い、ここでは「当てはめた後の誤差をどう測るか」を見る。",
      kind: "explain",
    },
    payload: { step: "overview", points, model, processedCount: 0 },
  });

  for (let i = 0; i < points.length; i++) {
    const processed = errors.slice(0, i + 1);
    const runningMetrics: Partial<MetricSet> = {
      mae: meanDefined(processed.map((e) => e.absError)),
      mse: meanDefined(processed.map((e) => e.sqError)),
      mape: meanDefined(processed.map((e) => e.pctError)),
      rmsle: Math.sqrt(meanDefined(processed.map((e) => e.logSqError))),
    };
    runningMetrics.rmse = Math.sqrt(runningMetrics.mse ?? Number.NaN);

    const e = errors[i];
    frames.push({
      highlights: [`point-${i}`],
      callout: {
        title: `点${i + 1}/${points.length}: 予約${points[i].x}件 → 実測${points[i].y}人(予測${e.predicted.toFixed(1)}人)`,
        body: `残差=${e.residual.toFixed(1)}, |残差|=${e.absError.toFixed(1)}, 残差²=${e.sqError.toFixed(1)}${
          e.pctError !== null ? `, 相対誤差=${e.pctError.toFixed(1)}%` : ""
        }`,
        note: `ここまで${i + 1}点の平均を取ると、MAE=${runningMetrics.mae?.toFixed(2)}・MSE=${runningMetrics.mse?.toFixed(2)}に更新される。`,
        kind: "supplement",
      },
      payload: {
        step: "point",
        points,
        model,
        pointIndex: i,
        error: e,
        processedCount: i + 1,
        runningMetrics,
      },
    });
  }

  frames.push({
    highlights: points.map((_, i) => `point-${i}`),
    callout: {
      title: "全点の処理が終わった: 5つの指標が出そろう",
      body: "MAE=誤差の絶対値の平均、MSE=誤差の二乗の平均(RMSE=その平方根)、MAPE=相対誤差(%)の平均、RMSLE=対数誤差の二乗平均の平方根。",
      note: "この後のラボで、1点を大きく外れ値化するとMSE/RMSEだけが跳ね上がり、MAEはあまり動かないことを確かめよう。",
      kind: "explain",
    },
    payload: {
      step: "summary",
      points,
      model,
      processedCount: points.length,
      finalMetrics: allMetricsOf(points, model),
    },
  });

  return frames;
}
