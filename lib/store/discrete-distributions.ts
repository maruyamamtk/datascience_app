import {
  DISCRETE_SPECS,
  discretePmfVector,
  type DiscreteKind,
  type DiscreteParams,
} from "@/lib/stats/discrete";
import { createTopicStore } from "./topicStore";

/** 離散分布ラボの操作値（選んだ種別と全パラメータを保持）。 */
export type DiscreteControls = {
  kind: DiscreteKind;
} & DiscreteParams;

/** 離散分布ラボの派生値。 */
export type DiscreteDerived = {
  /** PMF ベクトル。 */
  pmf: number[];
  /** 理論平均。 */
  mean: number;
  /** 理論分散。 */
  variance: number;
  /** パラメータ表記（例 Bin(10, 0.3)）。 */
  paramText: string;
};

/**
 * 離散型確率分布（C-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（種別ボタン・パラメータスライダー）は action を呼び、Render 層（PMF 棒 / 平均・分散の数式）は
 * このストアの `controls`・`derived` を購読する。種別を変えても各パラメータは保持し、行き来できる。
 */
export const useDiscreteStore = createTopicStore<DiscreteControls, DiscreteDerived>({
  initialControls: { kind: "binomial", n: 10, p: 0.4, lambda: 3, r: 3 },
  derive: ({ kind, n, p, lambda, r }) => {
    const params: DiscreteParams = { n, p, lambda, r };
    const spec = DISCRETE_SPECS[kind];
    return {
      pmf: discretePmfVector(kind, params),
      mean: spec.mean(params),
      variance: spec.variance(params),
      paramText: spec.paramText(params),
    };
  },
});
