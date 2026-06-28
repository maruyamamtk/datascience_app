/**
 * 順序統計量を «1 つずつ整列して取り出す» コマ送りのフレーム列ビルダー（計算層・純関数）。
 * 標本を昇順に並べ、x₍₁₎（最小）→ x₍₂₎ → … → x₍ₙ₎（最大）と取り出す過程を見せる。
 * 副作用なし（Vitest 対象）。描画（OrderStatStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { orderStatistics, sampleMedian } from "@/lib/stats/sufficiency";

/** 各フレーム（k 番目の順序統計量を取り出した時点）のスナップショット。 */
export type OrderStatPayload = {
  /** 取り出した順位 k（1 始まり）。 */
  k: number;
  /** k 番目の順序統計量 x₍ₖ₎。 */
  value: number;
  /** 昇順に並べた全体（参照用）。 */
  sorted: number[];
  /** 役割ラベル（最小・中央値・最大など）。 */
  role: string;
};

/**
 * 標本の順序統計量を 1 つずつ取り出すフレーム列を作る。
 * 最小（k=1）・最大（k=n）・中央値の位置に役割ラベルを付け、«並べると見える要約» を体感させる。
 */
export function buildOrderStatFrames(samples: readonly number[]): VizFrame<OrderStatPayload>[] {
  const sorted = orderStatistics(samples);
  const n = sorted.length;
  const median = sampleMedian(samples);
  const midLo = Math.floor((n - 1) / 2);
  const midHi = Math.ceil((n - 1) / 2);

  return sorted.map((value, i) => {
    const k = i + 1;
    let role = `第 ${k} 順序統計量 x₍${k}₎`;
    if (k === 1) role = "最小値 x₍₁₎";
    else if (k === n) role = `最大値 x₍${n}₎`;
    if (i === midLo || i === midHi) role += `（中央値 ${median} 付近）`;
    return {
      payload: { k, value, sorted, role },
      highlights: [`ord-${i}`],
      callout: {
        title: role,
        body: `昇順に並べた ${k} 番目は ${value}。`,
        note:
          k === n
            ? `最小・最大・中央値・四分位はすべて «順序統計量»。並べ替えで一気に見える要約。`
            : `順序統計量は «並べた位置» で決まる。外れ値に強い中央値・分位点の土台。`,
        kind: k === n ? "supplement" : "explain",
      },
    };
  });
}
