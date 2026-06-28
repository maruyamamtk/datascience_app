import { exponentialLogLikelihood, exponentialMle, exponentialScore } from "@/lib/stats/estimation";
import { createTopicStore } from "./topicStore";

/** 推定法ラボの固定標本（指数分布からの観測, 平均≈1.52 → λ̂≈0.66）。 */
export const ESTIMATION_SAMPLE = [0.5, 1.2, 2.0, 0.8, 3.1, 1.5, 0.9, 2.4];

/** 推定法ラボの操作値（手で動かす率 λ の推定）。 */
export type EstimationControls = {
  /** 推定中の率 λ（スライダー）。 */
  lambda: number;
};

/** 推定法ラボの派生値。 */
export type EstimationDerived = {
  /** 現在 λ での対数尤度。 */
  logLik: number;
  /** 最尤推定量 λ̂=1/x̄。 */
  mle: number;
  /** 勾配（スコア）d/dλ log L。MLE で 0。 */
  score: number;
};

/**
 * 推定法（D-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（λ スライダー）は action を呼び、Render 層（対数尤度曲線・現在地・MLE の数式）は
 * controls・derived を購読する。frame は勾配上昇法のステッパーが使う。
 */
export const useEstimationStore = createTopicStore<EstimationControls, EstimationDerived>({
  initialControls: { lambda: 0.3 },
  derive: ({ lambda }) => ({
    logLik: exponentialLogLikelihood(lambda, ESTIMATION_SAMPLE),
    mle: exponentialMle(ESTIMATION_SAMPLE),
    score: exponentialScore(lambda, ESTIMATION_SAMPLE),
  }),
});
