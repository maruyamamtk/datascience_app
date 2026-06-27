import { deriveMoments, type MomentControls, type MomentDerived } from "@/lib/stats/moments";
import { createTopicStore } from "./topicStore";

/**
 * 分布の特性値（B-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（数直線上の点ドラッグ）は action を呼び、Render 層（数直線＋重心＋σ帯 / モーメントの数式 /
 * 歪度・尖度の数値）はこのストアの `controls`・`derived` を購読する。派生値は計算層 `deriveMoments` が再計算。
 *
 * 初期は «右に裾の長い» 非対称な標本にして、歪度が正であることを最初の一手で見せる。
 * 使い方は docs/design/state-store.md（単回帰の useRegressionStore と同じ点ドラッグ型）。
 */
const INITIAL_POINTS = [1, 2, 2, 3, 3, 4, 8];

export const useMomentStore = createTopicStore<MomentControls, MomentDerived>({
  initialControls: { points: INITIAL_POINTS },
  derive: deriveMoments,
});
