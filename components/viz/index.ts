/**
 * 可視化共通部品（アルゴリズム図鑑スタイル）の再利用インターフェース（Issue #4）。
 *
 * 全トピックはここから import して様式を揃える:
 *   import { StepPlayer, Highlight, Callout, VizPanel, useFramePlayer } from "@/components/viz";
 *
 * 共通フォーマット = コマ送り（StepPlayer）/ 色ハイライト（Highlight）/ 近傍コールアウト（Callout）。
 * 状態（フレーム位置）は lib/store/topicStore.ts の `frame` を single source of truth とする。
 */
export { StepPlayer } from "./StepPlayer";
export { Highlight } from "./Highlight";
export { Callout } from "./Callout";
export { VizPanel } from "./VizPanel";
export { useFramePlayer } from "./useFramePlayer";
export {
  isFirstFrame,
  isLastFrame,
  stepTick,
  frameAt,
  isHighlighted,
  type VizFrame,
  type CalloutContent,
  type CalloutKind,
} from "./frame";
