/**
 * 被覆シミュレーション「信頼区間を 1 本ずつ提示する」コマ送りのフレーム列ビルダー（計算層・純関数）。
 * `simulateIntervals` の結果から、StepPlayer に渡す VizFrame 列を組み立てる。副作用なし（Vitest 対象）。
 * 描画（components/topics/interval/CoverageSimulator.tsx）はこの結果を購読するだけ（3層疎結合）。
 */

import type { VizFrame } from "@/components/viz";
import type { SimInterval } from "@/lib/stats/interval";

/** 各フレームで描画層が使う、i 本目まで提示した時点のスナップショット。 */
export type CoveragePayload = {
  /** これまでに提示した区間（このフレーム時点）。 */
  revealed: SimInterval[];
  /** いま提示した区間。 */
  latest: SimInterval;
  /** いま提示した区間の通し番号（1 始まり）。 */
  step: number;
  /** ここまでで母平均を含んだ本数。 */
  hits: number;
  /** ここまでの被覆率（hits / step）。 */
  rate: number;
};

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/**
 * 区間列を 1 本ずつ提示するフレーム列を作る。フレーム i では区間 0..i が見えている状態。
 * 各フレームのコールアウトは「この区間が母平均を含むか」と「ここまでの被覆率」を述べ、
 * 名目の信頼係数 level に近づく頻度論的意味を体感させる。
 */
export function buildCoverageFrames(
  intervals: readonly SimInterval[],
  level: number,
): VizFrame<CoveragePayload>[] {
  let hits = 0;
  return intervals.map((iv, i) => {
    if (iv.contains) hits += 1;
    const step = i + 1;
    const rate = hits / step;
    return {
      payload: { revealed: intervals.slice(0, step), latest: iv, step, hits, rate },
      // いま提示した区間を強調。
      highlights: [`ci-${i}`],
      callout: {
        title: `${step} 本目: ${iv.contains ? "母平均を含む ✓" : "母平均を外した ✗"}`,
        body: `ここまで ${step} 本中 ${hits} 本が母平均 μ を含む（被覆率 ${pct(rate)}）。`,
        note: `名目の信頼係数は ${pct(level)}。本数を増やすほど被覆率はこの値に近づきます（約 ${pct(
          1 - level,
        )} は外す）。`,
        kind: iv.contains ? "supplement" : "explain",
      },
    };
  });
}
