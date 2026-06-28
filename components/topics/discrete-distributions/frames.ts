/**
 * 二項分布 → ポアソン分布の収束を «n を増やしながら» 見せるコマ送りのフレーム列ビルダー
 * （計算層・純関数）。np=λ を固定したまま n を増やす（p=λ/n を小さくする）と、二項は Po(λ) に近づく。
 * 副作用なし（Vitest 対象）。描画（PoissonLimitStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { DISCRETE_SPECS, poissonPmf } from "@/lib/stats/discrete";

/** 各フレーム（ある n での二項 PMF とポアソン目標）のスナップショット。 */
export type PoissonLimitPayload = {
  /** 試行回数 n。 */
  n: number;
  /** 成功確率 p=λ/n。 */
  p: number;
  /** 二項 Bin(n, λ/n) の PMF（0..maxK）。 */
  binom: number[];
  /** 目標ポアソン Po(λ) の PMF（0..maxK）。 */
  poisson: number[];
  /** 最大の絶対差（収束の度合い）。 */
  maxDiff: number;
};

/**
 * λ を固定し、n のリスト（増えていく）に沿って «二項がポアソンへ近づく» フレーム列を作る。
 * 各フレームで Bin(n, λ/n) と Po(λ) の PMF を 0..maxK で並べ、最大差を添える。
 */
export function buildPoissonLimitFrames(
  lambda: number,
  ns: readonly number[],
  maxK = 12,
): VizFrame<PoissonLimitPayload>[] {
  const poisson: number[] = [];
  for (let k = 0; k <= maxK; k++) poisson.push(poissonPmf(k, lambda));

  return ns.map((n) => {
    const p = lambda / n;
    const binom: number[] = [];
    let maxDiff = 0;
    for (let k = 0; k <= maxK; k++) {
      const b = DISCRETE_SPECS.binomial.pmf(k, { n, p, lambda, r: 1 });
      binom.push(b);
      maxDiff = Math.max(maxDiff, Math.abs(b - poisson[k]));
    }
    return {
      payload: { n, p, binom, poisson, maxDiff },
      highlights: [`n-${n}`],
      callout: {
        title: `n = ${n}（p = λ/n = ${p.toFixed(3)}）`,
        body: `Bin(${n}, ${p.toFixed(3)}) と Po(${lambda}) の最大差は ${(maxDiff * 100).toFixed(
          2,
        )}%。n を増やすほど二項はポアソンに重なる。`,
        note:
          n >= ns[ns.length - 1]
            ? `np=${lambda} を保ったまま «稀な事象を多数回» にすると、二項はポアソン分布に収束する。`
            : `np=λ=${lambda} は固定。p を小さく・n を大きくしていく。`,
        kind: n >= ns[ns.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
