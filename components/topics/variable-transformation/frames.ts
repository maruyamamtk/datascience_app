/**
 * 2 つの離散分布の畳み込み（独立な和 Z=X+Y）を «和の値ごとに» 組み立てるコマ送りのフレーム列ビルダー
 * （計算層・純関数）。副作用なし（Vitest 対象）。描画（ConvolutionStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";

/** 各フレーム（和 s=k+2 を作る組合せ）のスナップショット。 */
export type ConvPayload = {
  /** 出力 index k（和は k + minSum）。 */
  k: number;
  /** 和の値 s。 */
  sum: number;
  /** この和を作る (i, j) の組（値ペア）。 */
  pairs: { i: number; j: number }[];
  /** P(Z=s)。 */
  prob: number;
};

const f = (x: number) => `${(x * 100).toFixed(1)}%`;

/**
 * 2 つのサイコロ（値 1..faces）の和の分布を 1 マスずつ作るフレーム列。
 * 和 s を作る組 (i,j)（i+j=s）を列挙し、その確率を足し合わせて P(Z=s) にする。
 * minSum=2（1+1）から maxSum=2·faces まで。
 */
export function buildConvolutionFrames(
  conv: readonly number[],
  faces = 6,
): VizFrame<ConvPayload>[] {
  return conv.map((prob, k) => {
    const sum = k + 2; // 値 1 始まりの2つの和の最小は 2
    const pairs: { i: number; j: number }[] = [];
    for (let i = 1; i <= faces; i++) {
      const j = sum - i;
      if (j >= 1 && j <= faces) pairs.push({ i, j });
    }
    return {
      payload: { k, sum, pairs, prob },
      highlights: [`cell-${k}`],
      callout: {
        title: `和 = ${sum} を作る`,
        body: `(${pairs.map((p) => `${p.i}+${p.j}`).join("), (")}) の ${pairs.length} 通り。各 ${f(
          1 / (faces * faces),
        )} を足して P(Z=${sum}) = ${f(prob)}。`,
        note:
          sum === 7
            ? `和 7 は組合せが最多（${pairs.length} 通り）で最も出やすい。だから «山» の頂点。`
            : `組合せの数 ÷ 全 ${faces * faces} 通り。これが畳み込み Σ_i P(X=i)P(Y=s−i)。`,
        kind: sum === 7 ? "supplement" : "explain",
      },
    };
  });
}
