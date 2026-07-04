import {
  ar1Variance,
  forecastAR1,
  simulateAR1,
  theoreticalAcfAR1,
} from "@/lib/stats/arima";
import { acf } from "@/lib/stats/time-series";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 系列長・ACF最大ラグ・予測期間は固定。 */
export const N = 120;
export const MAX_LAG = 20;
export const FORECAST_STEPS = 20;

/** 時系列モデルラボの操作値。 */
export type TSModelControls = {
  /** AR(1) 係数 φ（−0.95..0.95）。1に近いほど持続性が高い。 */
  phi: number;
  /** ショックの標準偏差 σ。 */
  sigma: number;
};

/** 時系列モデルラボの派生値。 */
export type TSModelDerived = {
  /** AR(1) の標本パス。 */
  series: number[];
  /** 理論自己相関 ρ(k)=φ^k。 */
  theoreticalAcf: number[];
  /** 標本自己相関（生成データから推定）。 */
  sampleAcf: number[];
  /** 理論分散 σ²/(1−φ²)。 */
  variance: number;
  /** 系列末尾からの h 期先予測（φ^h で平均へ減衰）。 */
  forecast: number[];
};

/**
 * 時系列モデル（M-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（φ・σ スライダー）は action を呼び、Render 層（AR(1)パス・理論/標本ACF・予測・数式）は
 * controls・derived を購読する。φ を1に近づけると自己相関の減衰が緩やかになり «長い記憶» になる。
 * データは固定シードで再現可能。frame は時系列モデルギャラリーのステッパーが使う。
 */
export const useTSModelStore = createTopicStore<TSModelControls, TSModelDerived>({
  initialControls: { phi: 0.7, sigma: 1 },
  derive: ({ phi, sigma }) => {
    const series = simulateAR1({ phi, sigma, n: N, rng: mulberry32(20250059) });
    return {
      series,
      theoreticalAcf: theoreticalAcfAR1(phi, MAX_LAG),
      sampleAcf: acf(series, MAX_LAG),
      variance: ar1Variance(phi, sigma),
      forecast: forecastAR1(series[series.length - 1], phi, FORECAST_STEPS),
    };
  },
});
