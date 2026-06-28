/**
 * 二項分布 → 正規分布の近似（de Moivre–Laplace）を «n を増やしながら» 見せるコマ送りのフレーム列
 * ビルダー（計算層・純関数）。n を増やすと二項 PMF が正規曲線に重なる（分布収束）。
 * 副作用なし（Vitest 対象）。描画（NormalApproxStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { maxApproxError } from "@/lib/stats/convergence";
import { binomialPmfVector } from "@/lib/stats/mass-functions";
import { normalPdf } from "@/lib/stats/normal";

/** 各フレーム（ある n での二項 PMF と正規近似曲線）のスナップショット。 */
export type NormalApproxPayload = {
  /** 試行回数 n。 */
  n: number;
  /** 成功確率 p。 */
  p: number;
  /** 二項 Bin(n,p) の PMF（0..n）。 */
  pmf: number[];
  /** 平均 np。 */
  mu: number;
  /** 標準偏差 √(np(1-p))。 */
  sigma: number;
  /** 正規近似曲線の点列（x は 0..n）。 */
  normal: { x: number; y: number }[];
  /** CDF 近似の最大誤差（連続修正あり）。 */
  maxError: number;
};

/**
 * p を固定し、n のリスト（増えていく）に沿って «二項が正規へ近づく» フレーム列を作る。
 * 各フレームで Bin(n,p) の PMF と N(np, np(1-p)) の曲線を並べ、CDF 近似の最大誤差を添える。
 */
export function buildNormalApproxFrames(
  p: number,
  ns: readonly number[],
  samples = 100,
): VizFrame<NormalApproxPayload>[] {
  return ns.map((n) => {
    const pmf = binomialPmfVector(n, p);
    const mu = n * p;
    const sigma = Math.sqrt(n * p * (1 - p));
    const normal: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * n;
      normal.push({ x, y: normalPdf(x, mu, sigma) });
    }
    const maxError = maxApproxError(n, p, true);
    return {
      payload: { n, p, pmf, mu, sigma, normal, maxError },
      highlights: [`n-${n}`],
      callout: {
        title: `n = ${n}（μ=np=${mu.toFixed(1)}, σ=${sigma.toFixed(2)}）`,
        body: `二項 Bin(${n}, ${p}) の棒と正規 N(${mu.toFixed(1)}, ${(sigma * sigma).toFixed(
          1,
        )}) の曲線。CDF 近似の最大誤差は ${(maxError * 100).toFixed(2)}%。`,
        note:
          n >= ns[ns.length - 1]
            ? `n を増やすと二項は正規に重なる（de Moivre–Laplace の定理、中心極限定理の離散版）。`
            : `n が小さいと «とがって» いて正規とずれる。n を増やすと滑らかな釣鐘へ。`,
        kind: n >= ns[ns.length - 1] ? "supplement" : "explain",
      },
    };
  });
}
