/**
 * 一致性（n→∞ で推定量が真値へ集中）を «n を増やしながら» 見せるコマ送りのフレーム列ビルダー
 * （計算層・純関数）。各 n で不偏分散の標本分布を作り、真値 σ² の周りに «狭く» なる様子を見せる。
 * 副作用なし（Vitest 対象）。描画（ConsistencyStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { simulateVarianceEstimators } from "@/lib/stats/estimator-properties";
import { mulberry32 } from "@/lib/stats/random";

/** 各フレーム（ある n での不偏分散の標本分布）のスナップショット。 */
export type ConsistencyPayload = {
  /** 標本サイズ n。 */
  n: number;
  /** 不偏分散の推定値列（標本分布）。 */
  estimates: number[];
  /** 真の母分散 σ²。 */
  trueVar: number;
  /** 推定量の分散（n→∞ で 0 へ）。 */
  variance: number;
};

/**
 * n のリストに沿って «不偏分散の標本分布が真値へ集中» するフレーム列を作る。
 * 一致性: バイアス→0 かつ 分散→0 なので、分布は真値 σ² の一点に潰れていく。
 */
export function buildConsistencyFrames(
  ns: readonly number[],
  sigma = 2,
  trials = 1500,
): VizFrame<ConsistencyPayload>[] {
  return ns.map((n, idx) => {
    const rng = mulberry32(1000 + idx);
    const { trueVar, unbiased } = simulateVarianceEstimators({ mu: 0, sigma, n, trials, rng });
    return {
      payload: { n, estimates: unbiased.estimates, trueVar, variance: unbiased.variance },
      highlights: [`n-${n}`],
      callout: {
        title: `n = ${n}`,
        body: `不偏分散の標本分布。真値 σ²=${trueVar} の周りのばらつき（分散）は ${unbiased.variance.toFixed(
          2,
        )}。`,
        note:
          n >= ns[ns.length - 1]
            ? `n を増やすと分布は真値 σ² の一点に潰れる＝一致性（バイアスも分散も 0 へ）。`
            : `n が大きいほど標本分布は狭く、真値の近くに集中する。`,
        kind: n >= ns[ns.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
