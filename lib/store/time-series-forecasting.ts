import {
  exponentialSmoothing,
  rmse,
  smoothingWeights,
  type SmoothingResult,
} from "@/lib/stats/forecasting";
import { generateSeries } from "@/lib/stats/time-series";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 系列長・重み表示個数は固定。 */
export const N = 90;
export const WEIGHT_COUNT = 12;

/** 時系列予測ラボの操作値。 */
export type ForecastControls = {
  /** 平滑化係数 α（0<α≤1）。大きいほど直近重視。 */
  alpha: number;
};

/** 時系列予測ラボの派生値。 */
export type ForecastDerived = {
  /** 観測系列。 */
  series: number[];
  /** 指数平滑化の結果（水準・1期先予測）。 */
  smoothing: SmoothingResult;
  /** 1期先予測の RMSE（t=1..、その時点で使える予測 vs 実測）。 */
  oneStepRmse: number;
  /** 過去 lag への重み α(1−α)^lag（幾何級数減衰）。 */
  weights: number[];
};

/**
 * 時系列予測と評価（M-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（α スライダー）は action を呼び、Render 層（系列・平滑化線・1期先予測・RMSE・重み減衰・数式）は
 * controls・derived を購読する。α を上げると直近を強く追い、下げると滑らかだが遅れて追う。
 * データは固定シードで再現可能。frame は予測手法比較のステッパーが使う。
 */
export const useForecastStore = createTopicStore<ForecastControls, ForecastDerived>({
  initialControls: { alpha: 0.3 },
  derive: ({ alpha }) => {
    const series = generateSeries({
      n: N,
      slope: 0.08,
      amp: 2.5,
      period: 12,
      noiseSd: 1.2,
      base: 12,
      rng: mulberry32(20250060),
    }).value;
    const smoothing = exponentialSmoothing(series, alpha);
    // 1期先予測の評価は t=1 以降（t=0 は自明）。
    return {
      series,
      smoothing,
      oneStepRmse: rmse(series.slice(1), smoothing.oneStep.slice(1)),
      weights: smoothingWeights(alpha, WEIGHT_COUNT),
    };
  },
});
