import { deriveInterval, type IntervalControls, type IntervalDerived } from "@/lib/stats/interval";
import { createTopicStore } from "./topicStore";

/**
 * 区間推定（信頼区間）トピックの Zustand ストア（single source of truth）。
 * Control 層（n・信頼係数・σ スライダー）は action を呼び、Render 層（区間バー / 数式 / 数値）は
 * このストアの `controls`・`derived` を購読する。派生値は計算層 `deriveInterval` が再計算する。
 *
 * 使い方は docs/design/state-store.md（CLT の useCltStore・正規分布の useNormalStore と同型）を参照。
 */
export const useIntervalStore = createTopicStore<IntervalControls, IntervalDerived>({
  initialControls: { n: 25, level: 0.95, sigma: 10 },
  derive: deriveInterval,
});
