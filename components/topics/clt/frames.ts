/**
 * CLT「1 標本を 1 観測ずつ引く」コマ送りのフレーム列ビルダー（計算層・純関数）。
 * 引いた観測列から、StepPlayer に渡す VizFrame 列を組み立てる。副作用なし（Vitest 対象）。
 * 描画（components/topics/clt/CltDrawStepper.tsx）はこの結果を購読するだけ（3層疎結合）。
 */

import type { VizFrame } from "@/components/viz";
import { sampleMean } from "@/lib/stats/clt";

/** 各フレームで描画層が使う、1 観測ぶん引いた時点のスナップショット。 */
export type DrawPayload = {
  /** これまでに引いた観測（このフレーム時点）。 */
  revealed: number[];
  /** いま引いた観測の値。 */
  latest: number;
  /** いま引いた観測の通し番号（1 始まり）。 */
  step: number;
  /** ここまでの暫定平均（revealed の平均）。 */
  partialMean: number;
};

/**
 * 観測列を 1 つずつ提示するフレーム列を作る。フレーム i では観測 0..i が見えている状態。
 * 最終フレームのコールアウトは「この 1 標本の平均が点 1 つになる」ことを述べる
 * （ヒストグラムの 1 本に対応する、という橋渡し）。
 */
export function buildDrawFrames(observations: readonly number[]): VizFrame<DrawPayload>[] {
  const n = observations.length;
  return observations.map((value, i) => {
    const revealed = observations.slice(0, i + 1);
    const partialMean = sampleMean(revealed);
    const last = i === n - 1;
    const fmt = (x: number) => x.toFixed(2);
    return {
      payload: { revealed, latest: value, step: i + 1, partialMean },
      // いま引いた観測と、連動する平均の項を強調。
      highlights: [`obs-${i}`, "partial-mean"],
      callout: {
        title: `${i + 1} 個目の観測 x = ${fmt(value)} を引いた`,
        body: last
          ? `n=${n} 個ぶん引き終わり。標本平均は ${fmt(partialMean)}。これがヒストグラムの 1 本になる。`
          : `ここまで ${i + 1} 個。暫定の標本平均は ${fmt(partialMean)}。`,
        note: last
          ? "「サンプリング」を繰り返すと、この点が何千個も積み上がって分布になります。"
          : "観測を足すたびに平均が動きます。n が大きいほど平均は安定します。",
        kind: last ? "explain" : "supplement",
      },
    };
  });
}
