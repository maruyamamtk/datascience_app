/**
 * ConvPoolStepper（畳み込み→プーリングを1コマずつ走査するステッパー）のフレーム列ビルダー
 * （計算層・純関数）。ConvLab の操作対象とは切り離し、常に同じ5×5入力・3×3縦エッジ検出フィルタ・
 * stride=1・padding=0（→3×3特徴マップ）で畳み込み9コマ、続けて2×2 Maxプーリング（stride=1）で
 * 4コマの計13コマを組み立てる（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。
 */

import type { VizFrame } from "@/components/viz";
import { conv2d, convWindowSum, padMatrix, pool2d, windowPositions, type Matrix } from "@/lib/stats/neural-network-models";
import { FILTER_PRESETS, INPUT_GRID } from "@/lib/store/neural-network-models";

export const STEPPER_INPUT: Matrix = INPUT_GRID;
export const STEPPER_FILTER: Matrix = FILTER_PRESETS["vertical-edge"];
export const STEPPER_STRIDE = 1;
export const STEPPER_PADDING = 0;
export const STEPPER_POOL_SIZE = 2;
export const STEPPER_POOL_STRIDE = 1;

export const STEPPER_CONV_OUT: Matrix = conv2d(STEPPER_INPUT, STEPPER_FILTER, {
  stride: STEPPER_STRIDE,
  padding: STEPPER_PADDING,
});
export const STEPPER_POOL_OUT: Matrix = pool2d(STEPPER_CONV_OUT, STEPPER_POOL_SIZE, STEPPER_POOL_STRIDE, "max");

export type ConvPoolPayload = {
  phase: "conv" | "pool";
  step: number;
  totalConv: number;
  totalPool: number;
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/** ConvPoolStepper のフレーム列（固定の入力・フィルタで13コマ: 畳み込み9→プーリング4）。 */
export function buildConvPoolFrames(): VizFrame<ConvPoolPayload>[] {
  const padded = padMatrix(STEPPER_INPUT, STEPPER_PADDING);
  const convPositions = windowPositions(STEPPER_CONV_OUT.length, STEPPER_CONV_OUT[0].length);
  const poolPositions = windowPositions(STEPPER_POOL_OUT.length, STEPPER_POOL_OUT[0].length);

  const frames: VizFrame<ConvPoolPayload>[] = [];

  convPositions.forEach((pos, idx) => {
    const top = pos.row * STEPPER_STRIDE;
    const left = pos.col * STEPPER_STRIDE;
    const inputHighlights: string[] = [];
    for (let a = 0; a < STEPPER_FILTER.length; a++) {
      for (let b = 0; b < STEPPER_FILTER[0].length; b++) inputHighlights.push(`in-${top + a}-${left + b}`);
    }
    const value = convWindowSum(padded, STEPPER_FILTER, top, left);
    frames.push({
      payload: { phase: "conv", step: idx + 1, totalConv: convPositions.length, totalPool: poolPositions.length },
      highlights: [...inputHighlights, `out-${pos.row}-${pos.col}`],
      callout: {
        title: `① 畳み込み ${idx + 1}/${convPositions.length}コマ目: 窓の左上=(${top},${left})`,
        body: `フィルタ（縦エッジ検出）を入力の(${top},${left})位置に重ね、要素ごとの積の総和 z=${fmt(value)} を出力の(${pos.row},${pos.col})マスに書き込む。`,
        note:
          idx === 0
            ? "フィルタは1マスずつ（stride=1）スライドしながら、«同じ重み» で入力全体をなぞる——これがパラメータ共有。全結合層と違い、遠く離れたピクセル同士を直接結ぶ重みは持たない（局所受容野）。"
            : undefined,
      },
    });
  });

  poolPositions.forEach((pos, idx) => {
    const top = pos.row * STEPPER_POOL_STRIDE;
    const left = pos.col * STEPPER_POOL_STRIDE;
    const convHighlights: string[] = [];
    for (let a = 0; a < STEPPER_POOL_SIZE; a++) {
      for (let b = 0; b < STEPPER_POOL_SIZE; b++) convHighlights.push(`out-${top + a}-${left + b}`);
    }
    const value = STEPPER_POOL_OUT[pos.row][pos.col];
    frames.push({
      payload: { phase: "pool", step: idx + 1, totalConv: convPositions.length, totalPool: poolPositions.length },
      highlights: [...convHighlights, `pool-${pos.row}-${pos.col}`],
      callout: {
        title: `② Maxプーリング ${idx + 1}/${poolPositions.length}コマ目: 窓の左上=(${top},${left})`,
        body: `畳み込み出力（特徴マップ）の2×2窓の中から最大値 ${fmt(value)} を採用し、プーリング出力の(${pos.row},${pos.col})マスに書き込む。`,
        note:
          idx === 0
            ? "プーリングは特徴マップを«要約»する操作——多少ズレた位置に同じ特徴があっても出力が変わりにくくなる（並進に対する頑健性）。学習パラメータを持たない点も畳み込み層と異なる。"
            : undefined,
        kind: "supplement",
      },
    });
  });

  return frames;
}
