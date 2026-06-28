/**
 * カイ二乗適合度統計量 χ²=Σ(Oᵢ−Eᵢ)²/Eᵢ を «カテゴリごとに» 積み上げるコマ送りのフレーム列ビルダー
 * （計算層・純関数）。各セルの寄与 (O−E)²/E を順に加え、最後に合計が χ² になる過程を見せる。
 * 副作用なし（Vitest 対象）。描画（ChiSquareStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import type { CellContribution } from "@/lib/stats/goodness-of-fit";

/** 各フレーム（i 番目のカテゴリまで加算した時点）のスナップショット。 */
export type GofStepPayload = {
  /** いま加えるカテゴリ index（0始まり）。 */
  i: number;
  /** このセル。 */
  cell: CellContribution;
  /** ここまでの累積 χ²。 */
  running: number;
};

const f2 = (x: number) => x.toFixed(2);

/** セル寄与列から χ² を1つずつ積み上げるフレーム列を作る。 */
export function buildGofFrames(cells: readonly CellContribution[]): VizFrame<GofStepPayload>[] {
  let running = 0;
  return cells.map((cell, i) => {
    running += cell.contribution;
    return {
      payload: { i, cell, running },
      highlights: [`cat-${i}`],
      callout: {
        title: `目 ${i + 1}: (O−E)²/E`,
        body: `観測 O=${cell.observed}、期待 E=${f2(cell.expected)}。寄与 (${cell.observed}−${f2(
          cell.expected,
        )})²/${f2(cell.expected)} = ${f2(cell.contribution)}。ここまでの χ² = ${f2(running)}。`,
        note:
          i === cells.length - 1
            ? `全カテゴリを足した χ² = ${f2(running)}。これを自由度 ${cells.length - 1} のカイ二乗分布と比べる。`
            : `期待からのずれが大きいセルほど寄与が大きい（差を E で割って «相対的な» ずれにする）。`,
        kind: i === cells.length - 1 ? "supplement" : "explain",
      },
    };
  });
}
