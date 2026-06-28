import {
  CONTINUOUS_SPECS,
  continuousCurve,
  type ContinuousKind,
  type ContinuousParams,
} from "@/lib/stats/continuous";
import { createTopicStore } from "./topicStore";

/** 連続分布ラボの操作値（選んだ種別と全パラメータ）。 */
export type ContinuousControls = {
  kind: ContinuousKind;
} & ContinuousParams;

/** 連続分布ラボの派生値。 */
export type ContinuousDerived = {
  /** PDF のサンプル点列。 */
  curve: { x: number; y: number }[];
  /** 理論平均（存在しなければ NaN）。 */
  mean: number;
  /** 理論分散（存在しなければ NaN）。 */
  variance: number;
  /** パラメータ表記。 */
  paramText: string;
};

/**
 * 連続型確率分布（C-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（種別ボタン・パラメータスライダー）は action を呼び、Render 層（PDF 曲線 / 平均・分散の数式）は
 * このストアの `controls`・`derived` を購読する。正規分布は別トピックなのでここには含めない。
 */
export const useContinuousStore = createTopicStore<ContinuousControls, ContinuousDerived>({
  initialControls: { kind: "gamma", lambda: 1, k: 2, theta: 1, mu: 0, sigma: 1 },
  derive: ({ kind, lambda, k, theta, mu, sigma }) => {
    const params: ContinuousParams = { lambda, k, theta, mu, sigma };
    const spec = CONTINUOUS_SPECS[kind];
    return {
      curve: continuousCurve(kind, params),
      mean: spec.mean(params),
      variance: spec.variance(params),
      paramText: spec.paramText(params),
    };
  },
});
