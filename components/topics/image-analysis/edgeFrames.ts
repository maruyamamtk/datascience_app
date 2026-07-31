/**
 * EdgeDetectionStepper（Sobelフィルタのスライドをコマ送りで見せるステッパー）のフレーム列ビルダー
 * （計算層・純関数）。FilterLab の操作対象とは切り離し、常に同じ5×5入力・3×3 Sobel Xフィルタ・
 * stride=1・padding=0（→3×3出力）で9コマを組み立てる（アルゴリズム図鑑スタイル）。副作用なし（Vitest対象）。
 */

import type { VizFrame } from "@/components/viz";
import { SOBEL_X, convWindowSum, padMatrix, windowPositions, type Matrix } from "@/lib/stats/image-analysis";

/** ステッパー専用の5×5入力（縦エッジ: 左2列が暗く、右3列が明るい）。 */
export const STEPPER_INPUT: Matrix = [
  [10, 10, 200, 200, 200],
  [10, 10, 200, 200, 200],
  [10, 10, 200, 200, 200],
  [10, 10, 200, 200, 200],
  [10, 10, 200, 200, 200],
];

export const STEPPER_FILTER: Matrix = SOBEL_X;
export const STEPPER_STRIDE = 1;
export const STEPPER_PADDING = 0;

const outRows = STEPPER_INPUT.length - STEPPER_FILTER.length + 1;
const outCols = STEPPER_INPUT[0].length - STEPPER_FILTER[0].length + 1;
const PADDED_INPUT = padMatrix(STEPPER_INPUT, STEPPER_PADDING);

export const STEPPER_OUTPUT: Matrix = Array.from({ length: outRows }, (_, i) =>
  Array.from({ length: outCols }, (_, j) =>
    convWindowSum(PADDED_INPUT, STEPPER_FILTER, i * STEPPER_STRIDE, j * STEPPER_STRIDE),
  ),
);

export type EdgePayload = {
  step: number;
  total: number;
  row: number;
  col: number;
  value: number;
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** EdgeDetectionStepper のフレーム列（固定の5×5入力で9コマ、Sobel Xフィルタを1マスずつスライド）。 */
export function buildEdgeFrames(): VizFrame<EdgePayload>[] {
  const positions = windowPositions(outRows, outCols);

  return positions.map((pos, idx) => {
    const top = pos.row * STEPPER_STRIDE;
    const left = pos.col * STEPPER_STRIDE;
    const inputHighlights: string[] = [];
    for (let a = 0; a < STEPPER_FILTER.length; a++) {
      for (let b = 0; b < STEPPER_FILTER[0].length; b++) inputHighlights.push(`in-${top + a}-${left + b}`);
    }
    const value = convWindowSum(PADDED_INPUT, STEPPER_FILTER, top, left);
    const onEdge = left <= 1 && left + STEPPER_FILTER[0].length - 1 >= 2;

    return {
      payload: { step: idx + 1, total: positions.length, row: pos.row, col: pos.col, value },
      highlights: [...inputHighlights, `out-${pos.row}-${pos.col}`],
      callout: {
        title: `${idx + 1}/${positions.length}コマ目: 窓の左上=(${top},${left})`,
        body: onEdge
          ? `フィルタが明暗の境界（列1↔2）にかかっている——縦方向の輝度差を検出し z=${fmt(value)} という大きな値が出力される。`
          : `フィルタの窓の中は輝度がほぼ一様——明暗の変化が無いため z=${fmt(value)}（0に近い）になる。`,
        note:
          idx === 0
            ? "Sobelフィルタ（縦エッジ検出）は左右の輝度差に反応する重み配置——窓の中に«境界»が入って初めて大きな値が出る。境界が窓の外にあるうちは0のまま。"
            : undefined,
        kind: onEdge ? "explain" : "supplement",
      },
    };
  });
}
