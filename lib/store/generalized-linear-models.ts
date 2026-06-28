import { generateCountData, poissonDeviance, poissonLogLikelihood } from "@/lib/stats/glm";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** カウントデータの固定設定（真のモデル: λ=exp(0.2+0.6x)）。 */
const TRUE_B0 = 0.2;
const TRUE_B1 = 0.6;
export const COUNT_DATA = generateCountData({
  n: 40,
  b0: TRUE_B0,
  b1: TRUE_B1,
  xMin: 0,
  xMax: 4,
  rng: mulberry32(20240902),
});

/** GLM（ポアソン回帰）ラボの操作値。 */
export type GlmControls = {
  /** 切片 b0。 */
  b0: number;
  /** 傾き b1（対数リンクの線形係数）。 */
  b1: number;
};

/** GLM ラボの派生値。 */
export type GlmDerived = {
  /** 現在の (b0,b1) でのポアソン対数尤度。 */
  logLik: number;
  /** デビアンス（当てはまりの悪さ）。 */
  deviance: number;
};

/**
 * 一般化線形モデル（F-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（b0・b1 スライダー）は action を呼び、Render 層（指数の平均曲線 λ=exp(b0+b1x)・カウント点・
 * デビアンス・対数尤度）は controls・derived を購読する。frame は GLM 族ギャラリーのステッパーが使う。
 */
export const useGlmStore = createTopicStore<GlmControls, GlmDerived>({
  initialControls: { b0: 0, b1: 0.3 },
  derive: ({ b0, b1 }) => ({
    logLik: poissonLogLikelihood(COUNT_DATA.x, COUNT_DATA.y, b0, b1),
    deviance: poissonDeviance(COUNT_DATA.x, COUNT_DATA.y, b0, b1),
  }),
});
