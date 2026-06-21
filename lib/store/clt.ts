import { deriveClt, type CltControls, type CltDerived } from "@/lib/stats/clt";
import { createTopicStore } from "./topicStore";

/**
 * 中心極限定理(CLT)トピックの Zustand ストア（single source of truth）。
 * Control 層（スライダー等）は action を呼び、Render 層（Graph / Math / 数値表示）は
 * このストアの `controls`・`derived` を購読する。派生値は計算層 `deriveClt` が再計算する。
 *
 * 使い方は docs/design/state-store.md を参照。
 */
export const useCltStore = createTopicStore<CltControls, CltDerived>({
  initialControls: { sigma: 10, n: 4 },
  derive: deriveClt,
});
