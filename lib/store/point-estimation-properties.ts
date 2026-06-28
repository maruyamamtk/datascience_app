import { createTopicStore } from "./topicStore";

/** 点推定の性質ラボの操作値。 */
export type EstPropControls = {
  /** 各標本のサイズ n（小さいほど偏り分散のバイアスが大きい）。 */
  n: number;
};

/** 点推定の性質ラボの派生値。 */
export type EstPropDerived = {
  /** 真の母分散 σ²（母 σ=2 固定なので 4）。 */
  trueVar: number;
  /** 偏り分散 S²ₙ の理論バイアス −σ²/n。 */
  theoreticalBias: number;
};

/** シミュレーションの母標準偏差（固定）。真の母分散は σ²=4。 */
export const EST_SIGMA = 2;

/**
 * 点推定の性質（D-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（n スライダー）は action を呼び、Render 層（推定量の標本分布・バイアス/分散/MSE の数式）は
 * controls・derived を購読する。frame は一致性ステッパー（n を増やすと真値へ集中）が使う。
 */
export const useEstPropStore = createTopicStore<EstPropControls, EstPropDerived>({
  initialControls: { n: 5 },
  derive: ({ n }) => ({
    trueVar: EST_SIGMA * EST_SIGMA,
    theoreticalBias: -(EST_SIGMA * EST_SIGMA) / Math.max(1, n),
  }),
});
