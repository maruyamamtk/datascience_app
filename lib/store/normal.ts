import { deriveNormal, type NormalControls, type NormalDerived } from "@/lib/stats/normal";
import { createTopicStore } from "./topicStore";

/**
 * 正規分布トピックの Zustand ストア（single source of truth）。
 * Control 層（μ/σ スライダー）は action を呼び、Render 層（密度曲線 / 数式 / 数値）は
 * このストアの `controls`・`derived` を購読する。派生値は計算層 `deriveNormal` が再計算する。
 *
 * 使い方は docs/design/state-store.md（CLT の useCltStore と同型）を参照。
 */
export const useNormalStore = createTopicStore<NormalControls, NormalDerived>({
  initialControls: { mu: 0, sigma: 1 },
  derive: deriveNormal,
});
