import { deriveTest, type HypothesisControls, type HypothesisDerived } from "@/lib/stats/test";
import { createTopicStore } from "./topicStore";

/**
 * 仮説検定トピックの Zustand ストア（single source of truth）。
 * Control 層（効果量・n・α スライダー・片側/両側）は action を呼び、Render 層（2分布グラフ / 数式 /
 * 数値）はこのストアの `controls`・`derived` を購読する。派生値は計算層 `deriveTest` が再計算する。
 *
 * 使い方は docs/design/state-store.md（正規分布 useNormalStore・区間推定 useIntervalStore と同型）。
 */
export const useTestStore = createTopicStore<HypothesisControls, HypothesisDerived>({
  initialControls: { effectSize: 0.5, n: 30, alpha: 0.05, alternative: "two-sided" },
  derive: deriveTest,
});
