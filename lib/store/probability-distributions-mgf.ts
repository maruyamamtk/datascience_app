import { deriveMass, type MassControls, type MassDerived } from "@/lib/stats/mass-functions";
import { createTopicStore } from "./topicStore";

/**
 * 確率分布と母関数（B-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（n・p・しきい値 x のスライダー）は action を呼び、Render 層（PMF 棒 / CDF 階段 /
 * 生存関数 / 数式 F(x)・S(x)）はこのストアの `controls`・`derived` を購読する。
 * 派生値は計算層 `deriveMass` が再計算する。
 *
 * 初期は Bin(10, 0.5)・x=5（左右対称で CDF が 0.5 を跨ぐ点）。使い方は docs/design/state-store.md。
 */
export const useMassStore = createTopicStore<MassControls, MassDerived>({
  initialControls: { n: 10, p: 0.5, x: 5 },
  derive: deriveMass,
});
