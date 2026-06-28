/**
 * 並べ替え検定の «帰無分布» を少しずつ積み上げるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * ラベルをランダムに割り直した平均差を段階的に集め、観測差がどれだけ «端» にあるかを見せる。
 * 副作用なし（Vitest 対象）。描画（PermutationStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";

/** 各フレーム（ある回数まで並べ替えた時点）のスナップショット。 */
export type PermPayload = {
  /** ここまでに集めた並べ替え平均差。 */
  collected: number[];
  /** 提示した回数。 */
  count: number;
  /** 観測差。 */
  observed: number;
  /** ここまでの p 値推定（|差|≥|観測| の割合）。 */
  pEstimate: number;
};

/**
 * 帰無分布の配列を、段階的な «提示数» の節目で切り出したフレーム列を作る。
 * steps（例 [10,50,200,1200]）ごとに、その時点までの平均差・p 推定を提示する。
 */
export function buildPermutationFrames(
  nullDist: readonly number[],
  observed: number,
  steps: readonly number[],
): VizFrame<PermPayload>[] {
  const absObs = Math.abs(observed);
  return steps.map((s) => {
    const collected = nullDist.slice(0, Math.min(s, nullDist.length));
    const hits = collected.reduce((a, d) => a + (Math.abs(d) >= absObs - 1e-12 ? 1 : 0), 0);
    const pEstimate = collected.length > 0 ? hits / collected.length : Number.NaN;
    return {
      payload: { collected, count: collected.length, observed, pEstimate },
      highlights: ["observed"],
      callout: {
        title: `並べ替え ${collected.length} 回`,
        body: `ラベルをランダムに割り直した平均差を ${collected.length} 個集めた。観測差 ${observed.toFixed(
          2,
        )} 以上に極端なのは ${(pEstimate * 100).toFixed(1)}%。`,
        note:
          s >= steps[steps.length - 1]
            ? `この割合が並べ替え検定の p 値。分布を一切仮定せず «観測がどれだけ端か» を直接数えた。`
            : `回数を増やすほど帰無分布が滑らかになり、p の推定が安定する。`,
        kind: s >= steps[steps.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
