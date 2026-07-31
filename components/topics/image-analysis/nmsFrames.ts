/**
 * NmsStepper（非最大値抑制の反復をコマ送りで見せるステッパー）のフレーム列ビルダー
 * （計算層・純関数）。固定の5候補ボックス（2つの物体それぞれに重複検出がある想定）で、
 * スコア降順に採用→抑制を繰り返す様子を1ステップ=1コマとして組み立てる（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest対象）。
 */

import type { VizFrame } from "@/components/viz";
import { nonMaxSuppression, type ScoredBox } from "@/lib/stats/image-analysis";

/**
 * 固定の候補ボックス（100×100の画像領域に2つの物体、それぞれ複数の重複検出がある想定）。
 * クラスタA（左上の物体、index 0-2）とクラスタB（右下の物体、index 3-4）。
 */
export const NMS_BOXES: ScoredBox[] = [
  { x: 8, y: 8, w: 40, h: 40, score: 0.95, label: "候補①" },
  { x: 14, y: 12, w: 38, h: 36, score: 0.75, label: "候補②" },
  { x: 4, y: 16, w: 36, h: 38, score: 0.6, label: "候補③" },
  { x: 55, y: 52, w: 34, h: 34, score: 0.85, label: "候補④" },
  { x: 60, y: 48, w: 30, h: 32, score: 0.55, label: "候補⑤" },
];

export const NMS_IOU_THRESHOLD = 0.5;

export type NmsPayload = {
  step: number;
  total: number;
  keepIndex: number;
  suppressedIndices: number[];
  remainingIndices: number[];
};

const fmt = (v: number) => v.toFixed(2);

/** NmsStepper のフレーム列（固定の5候補・しきい値0.5で、採用→抑制を1ステップずつ）。 */
export function buildNmsFrames(): VizFrame<NmsPayload>[] {
  const { steps } = nonMaxSuppression(NMS_BOXES, NMS_IOU_THRESHOLD);

  return steps.map((step, idx) => {
    const keptBox = NMS_BOXES[step.keepIndex];
    const suppressedNames = step.suppressed.map((s) => NMS_BOXES[s.index].label ?? `#${s.index}`).join("・");
    const iouList = step.suppressed.map((s) => `${NMS_BOXES[s.index].label}(IoU=${fmt(s.iouValue)})`).join(", ");

    return {
      payload: {
        step: idx + 1,
        total: steps.length,
        keepIndex: step.keepIndex,
        suppressedIndices: step.suppressed.map((s) => s.index),
        remainingIndices: step.remainingIndices,
      },
      highlights: [`keep-${step.keepIndex}`, ...step.suppressed.map((s) => `suppress-${s.index}`)],
      callout: {
        title: `${idx + 1}/${steps.length}コマ目: ${keptBox.label}（スコア${fmt(keptBox.score)}）を採用`,
        body:
          step.suppressed.length > 0
            ? `残った候補の中で最もスコアが高い ${keptBox.label} を採用（緑）。IoUがしきい値 ${NMS_IOU_THRESHOLD} 以上の ${suppressedNames} を同じ物体の重複検出とみなして抑制（赤・破線）する: ${iouList}`
            : `残った候補の中で最もスコアが高い ${keptBox.label} を採用（緑）。しきい値 ${NMS_IOU_THRESHOLD} 以上重なる候補は残っていないため、抑制は発生しない。`,
        note:
          idx === 0
            ? "NMSは«スコアが最も高い候補»から確定させ、それと大きく重なる（IoUが高い）候補を«同じ物体を指す重複»とみなして間引く——スコアだけでは重複を消せないので、位置の重なり（IoU）を必ず併用する。"
            : undefined,
      },
    };
  });
}
