import { deriveBayes, type BayesControls, type BayesDerived } from "@/lib/stats/bayes";
import { createTopicStore } from "./topicStore";

/**
 * 事象と確率（B-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（有病率 prior・感度・特異度のスライダー）は action を呼び、Render 層（モザイク図 /
 * ベイズの定理の数式 / 事後確率の数値）はこのストアの `controls`・`derived` を購読する。
 * 派生値は計算層 `deriveBayes` が再計算する。
 *
 * 初期値は有名な「有病率1%・感度90%・特異度91%」の検査例（陽性でも事後は約9%）で、
 * 「条件付き確率の向きを取り違える罠」を最初の一手で体感させる。
 * 使い方は docs/design/state-store.md（信頼区間・正規分布の各ストアと同型）。
 */
export const useProbabilityStore = createTopicStore<BayesControls, BayesDerived>({
  initialControls: { prior: 0.01, sensitivity: 0.9, specificity: 0.91 },
  derive: deriveBayes,
});
