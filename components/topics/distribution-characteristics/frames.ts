/**
 * 分散を «1 点ずつ» 足し上げるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * 各点の偏差平方 (xᵢ−μ)² を順に加え、最後に n で割って分散 σ² になる過程を見せる。
 * 副作用なし（Vitest 対象）。描画（VarianceStepper.tsx）はこの結果を購読するだけ（3層疎結合）。
 */

import type { VizFrame } from "@/components/viz";
import { mean } from "@/lib/stats/moments";

/** 各フレームで描画層が使うスナップショット。 */
export type VariancePayload = {
  /** いま加える点の index（0..n−1）。 */
  i: number;
  /** いま加える点の値 xᵢ。 */
  x: number;
  /** 平均 μ。 */
  mu: number;
  /** 偏差 xᵢ−μ。 */
  dev: number;
  /** 偏差平方 (xᵢ−μ)²。 */
  sq: number;
  /** ここまでの偏差平方和。 */
  runningSum: number;
  /** ここまでの平均二乗偏差（runningSum/(i+1)、途中経過）。 */
  runningVar: number;
};

const f2 = (x: number): string => (Number.isFinite(x) ? x.toFixed(2) : "—");

/**
 * 分散 σ² = (1/n)Σ(xᵢ−μ)² を、点を 1 つずつ加えながら組み立てるフレーム列を作る。
 * フレーム i では点 0..i の偏差平方が加算済み。最後のフレームで Σ を n で割ると母分散になる。
 */
export function buildVarianceFrames(points: readonly number[]): VizFrame<VariancePayload>[] {
  const mu = mean(points);
  let sum = 0;
  return points.map((x, i) => {
    const dev = x - mu;
    const sq = dev * dev;
    sum += sq;
    const runningVar = sum / (i + 1);
    return {
      payload: { i, x, mu, dev, sq, runningSum: sum, runningVar },
      highlights: [`pt-${i}`],
      callout: {
        title: `点 ${i + 1}: x = ${f2(x)}`,
        body: `偏差 (x−μ) = ${f2(x)} − ${f2(mu)} = ${f2(dev)}、その平方 = ${f2(sq)}。ここまでの偏差平方和 = ${f2(
          sum,
        )}。`,
        note:
          i === points.length - 1
            ? `最後に n=${points.length} で割ると母分散 σ² = ${f2(sum / points.length)}。`
            : `平均からの «離れ» を平方（符号を消して大きい外れを強調）して足していく。`,
        kind: i === points.length - 1 ? "supplement" : "explain",
      },
    };
  });
}
