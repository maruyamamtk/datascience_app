import { normalTestErrors, npThreshold } from "@/lib/stats/test-derivation";
import { createTopicStore } from "./topicStore";

/** ネイマン・ピアソン・ラボの固定設定（2つの単純仮説）。 */
export const NP_CONFIG = { mu0: 0, mu1: 1.2, sigma: 1, n: 20 };

/** 検定法の導出ラボの操作値。 */
export type TestDerivControls = {
  /** 棄却域の閾値 c（x̄>c で棄却）。 */
  c: number;
};

/** 検定法の導出ラボの派生値。 */
export type TestDerivDerived = {
  /** 第一種の過誤 α=P(x̄>c|H0)。 */
  alpha: number;
  /** 検出力 power=P(x̄>c|H1)。 */
  power: number;
  /** 標準誤差 se=σ/√n。 */
  se: number;
  /** α=0.05 のネイマン・ピアソン閾値（最強力検定の境界）。 */
  npThreshold05: number;
};

/**
 * 検定法の導出（E-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（閾値 c スライダー）は action を呼び、Render 層（H0/H1 の分布・α/検出力・数式）は
 * controls・derived を購読する。frame は3検定（ワルド/スコア/尤度比）の幾何ステッパーが使う。
 */
export const useTestDerivStore = createTopicStore<TestDerivControls, TestDerivDerived>({
  initialControls: { c: 0.37 },
  derive: ({ c }) => {
    const { alpha, power, se } = normalTestErrors({ ...NP_CONFIG, c });
    return {
      alpha,
      power,
      se,
      npThreshold05: npThreshold(NP_CONFIG.mu0, NP_CONFIG.sigma, NP_CONFIG.n, 0.05),
    };
  },
});
