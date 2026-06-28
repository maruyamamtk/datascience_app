/**
 * 大数の法則と正規近似（B-5）トピックの計算層（純関数）。
 * 標本平均の «累積平均» が母平均へ収束する様子（大数の法則）と、二項・ポアソンの正規近似
 * （連続修正つき）を純関数で与える。確率収束・分布収束の «体感» を支える。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 * 正規 CDF・PDF は normal.ts、二項 PMF・CDF は mass-functions.ts を再利用する。
 */

import { cdfFromPmf, binomialPmfVector } from "./mass-functions";
import { normalCdf } from "./normal";

/**
 * 観測列の «累積平均» 列 [x̄₁, x̄₂, …]（i 番目は最初の i 個の平均）。
 * 大数の法則「n を増やすと標本平均が母平均へ収束」を可視化するための前処理。
 */
export function runningMeans(samples: readonly number[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    out.push(sum / (i + 1));
  }
  return out;
}

/**
 * 二項分布 Bin(n,p) の正規近似による P(X≤k)。
 * 連続修正つきなら Φ((k+0.5−np)/σ)、なしなら Φ((k−np)/σ)（σ=√(np(1−p))）。
 * 「離散を連続で近似する」ので、境界に 0.5 を足す連続修正で精度が上がる。
 */
export function binomialNormalApproxCdf(
  k: number,
  n: number,
  p: number,
  continuity = true,
): number {
  const mu = n * p;
  const sigma = Math.sqrt(n * p * (1 - p));
  if (sigma <= 0) return k >= mu ? 1 : 0;
  const x = continuity ? k + 0.5 : k;
  return normalCdf(x, mu, sigma);
}

/** 二項の «正確な» CDF P(X≤k)（mass-functions の再利用）。 */
export function binomialExactCdf(k: number, n: number, p: number): number {
  const cdf = cdfFromPmf(binomialPmfVector(n, p));
  if (k < 0) return 0;
  return cdf[Math.min(cdf.length - 1, Math.floor(k))] ?? 1;
}

/**
 * 二項 CDF の正規近似誤差 |正確 − 近似| を k=0..n で最大化したもの。
 * 連続修正の有無で比べると «連続修正ありの方が誤差が小さい» ことを定量化できる。
 */
export function maxApproxError(n: number, p: number, continuity = true): number {
  let maxErr = 0;
  for (let k = 0; k <= n; k++) {
    const err = Math.abs(binomialExactCdf(k, n, p) - binomialNormalApproxCdf(k, n, p, continuity));
    maxErr = Math.max(maxErr, err);
  }
  return maxErr;
}

/**
 * デルタ法による g(X̄) の漸近分散の係数。
 * X̄ ≈ N(μ, σ²/n) のとき g(X̄) ≈ N(g(μ), g'(μ)²·σ²/n)。返すのは漸近分散 g'(μ)²σ²/n。
 */
export function deltaMethodVariance(gPrimeAtMu: number, sigma2: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return gPrimeAtMu * gPrimeAtMu * (sigma2 / n);
}
