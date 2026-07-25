import {
  DEFAULT_GROUPS,
  DEFAULT_MIXTURE,
  DEFAULT_MIXTURE_DATA,
  DEFAULT_REGRESSION_DATA,
  bayesianLinearRegression,
  compareEstimates,
  grandMean,
  pooledWithinVariance,
  responsibility,
  type GroupEstimate,
  type RegressionPosterior,
} from "@/lib/stats/hierarchical-bayes";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定の例データ（決定的に生成済み、モジュール定数として一度だけ計算する）。
// ────────────────────────────────────────────────────────────

export const GROUPS = DEFAULT_GROUPS;
export const SIGMA2 = pooledWithinVariance(GROUPS);
export const MU = grandMean(GROUPS);
export const REGRESSION_SIGMA2 = 200;

/** τ²（グループ間分散）スライダーの範囲。真の値(TRUE_BETWEEN_SD²=36)を挟む対数的な範囲。 */
export const TAU2_MIN = 1;
export const TAU2_MAX = 400;
export const TAU2_DEFAULT = 36;

/** ベイズ線形回帰の傾きの事前分散 τ_β² スライダーの範囲。 */
export const PRIOR_VAR_SLOPE_MIN = 0.5;
export const PRIOR_VAR_SLOPE_MAX = 500;
export const PRIOR_VAR_SLOPE_DEFAULT = 20;

/** 潜在変数ラボの「観測値x」スライダーの範囲。 */
export const LATENT_X_MIN = 10;
export const LATENT_X_MAX = 105;
export const LATENT_X_DEFAULT = 58;

export type MainControls = {
  /** L0/L1: 階層ベイズモデルのハイパー事前分散τ²（グループ間分散）。 */
  tau2: number;
  /** L1: ベイズ線形回帰の傾きの事前分散τ_β²。 */
  priorVarSlope: number;
  /** L2: 潜在変数ラボで動かす観測値x。 */
  latentX: number;
};

export type MainDerived = {
  estimates: GroupEstimate[];
  regression: RegressionPosterior;
  latentProbs: number[];
};

export const INITIAL_CONTROLS: MainControls = {
  tau2: TAU2_DEFAULT,
  priorVarSlope: PRIOR_VAR_SLOPE_DEFAULT,
  latentX: LATENT_X_DEFAULT,
};

/**
 * 階層ベイズモデル(K-3)トピックのZustandストア(single source of truth)。
 * Control層(τ²・τ_β²・観測値xのスライダー)はsetControlを呼び、Render層(表・グラフ・数式ハイライト)は
 * このストアのcontrols・derivedを購読するだけ(3層疎結合)。
 *
 * L0のShrinkageLabはStepPlayer(frame)も使うが、本トピックはページ全体でStepPlayerが1つだけなので
 * (tasks/lessons.md #76の判断目安どおり)専用の空ストアを追加せず、このメインストアのframeを共用する。
 */
export const useHierarchicalBayesStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  initialFrameCount: GROUPS.length,
  derive: (controls) => ({
    estimates: compareEstimates(GROUPS, controls.tau2, SIGMA2, MU),
    regression: bayesianLinearRegression(DEFAULT_REGRESSION_DATA, REGRESSION_SIGMA2, controls.priorVarSlope),
    latentProbs: responsibility(controls.latentX, DEFAULT_MIXTURE),
  }),
});

export { DEFAULT_MIXTURE, DEFAULT_MIXTURE_DATA, DEFAULT_REGRESSION_DATA };
