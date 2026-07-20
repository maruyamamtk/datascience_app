import {
  allMetricsOf,
  FIXED_MODEL,
  generateMetricPoints,
  type MetricSet,
  metricRatios,
  type Model,
  N_POINTS,
  type Point,
  pointErrorsOf,
} from "@/lib/stats/regression-metrics";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データ(決定的LCG)・既に学習済みの固定モデル
// ────────────────────────────────────────────────────────────

export const MODEL: Model = FIXED_MODEL;
export const DATA_SEED = 20260720;
export const INITIAL_POINTS: Point[] = generateMetricPoints(DATA_SEED, MODEL);
/** 外れ値化する前の基準指標(外れ値への感度比較=比率のbaseline)。 */
export const BASELINE_METRICS: MetricSet = allMetricsOf(INITIAL_POINTS, MODEL);

/** 「外れ値を作る」ボタンで動かす点のindexとズレ量。 */
export const OUTLIER_INDEX = INITIAL_POINTS.length - 1;
export const OUTLIER_DELTA_Y = 55;

export const Y_DRAG_MIN = 0;
export const Y_DRAG_MAX = 170;

// ────────────────────────────────────────────────────────────
// メインストア(MetricsLab + MetricsStepperが共用, 1トピック1ステッパーなので
// tasks/lessons.md #76 の判断目安どおりmainストアのframeを共用してよい)
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 散布図の観測点(実測の来店者数)。ドラッグで動かせる single source of truth。 */
  points: Point[];
};

export type MainDerived = {
  points: Point[];
  errors: ReturnType<typeof pointErrorsOf>;
  metrics: MetricSet;
  /** baselineに対する現在の比率(外れ値への感度比較用)。 */
  ratios: Record<keyof MetricSet, number | null>;
};

/**
 * 回帰の評価指標トピックの Zustand ストア(single source of truth)。
 * Control 層(点ドラッグ・「外れ値を作る」ボタン)は setControl を呼び、Render 層(散布図 / 残差 /
 * 5指標の数式・数値・比率バー)はこのストアの `controls`・`derived` を購読する。
 * MetricsStepper は同じストアの `frame` を共用する(ステッパーは1つだけなので #76 の判断目安どおり)。
 */
export const useRegressionMetricsStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { points: INITIAL_POINTS },
  initialFrameCount: N_POINTS + 2, // overview(1) + 各点(N_POINTS) + summary(1)
  derive: ({ points }) => {
    const errors = pointErrorsOf(points, MODEL);
    const metrics = allMetricsOf(points, MODEL);
    return { points, errors, metrics, ratios: metricRatios(metrics, BASELINE_METRICS) };
  },
});
