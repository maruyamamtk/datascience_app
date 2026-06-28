/**
 * 検定法の導出（E-2）トピックの計算層（純関数）。
 * ネイマン・ピアソンの基本定理（尤度比検定が最強力）と、ワルド型・スコア・尤度比の3検定統計量を扱う。
 * 「最強力検定はどう作るか」「3つの検定はどう違うか」を体感する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。正規 CDF/PDF は normal.ts を再利用。
 */

import { normalPdf, standardNormalCdf } from "./normal";

/**
 * 2 つの単純仮説 H0: μ=μ0 vs H1: μ=μ1（σ既知, 標本平均 x̄~N(μ,σ²/n)）の検定で、
 * 棄却域 {x̄ > c}（μ1>μ0 を想定）の第一種の過誤 α と検出力 power を返す。
 * α=P(x̄>c | H0)、power=P(x̄>c | H1)。se=σ/√n。
 */
export function normalTestErrors(params: {
  mu0: number;
  mu1: number;
  sigma: number;
  n: number;
  c: number;
}): { alpha: number; power: number; se: number } {
  const { mu0, mu1, sigma, n, c } = params;
  const se = sigma / Math.sqrt(n);
  const alpha = 1 - standardNormalCdf((c - mu0) / se);
  const power = 1 - standardNormalCdf((c - mu1) / se);
  return { alpha, power, se };
}

/**
 * 与えた α に対するネイマン・ピアソン棄却閾値 c（H0 の右側 α 点）。
 * c = μ0 + z_{1−α}·se。これが «α を固定して検出力を最大化» する最強力検定の境界。
 */
export function npThreshold(mu0: number, sigma: number, n: number, alpha: number): number {
  const se = sigma / Math.sqrt(n);
  // z_{1−α}：標準正規の上側 α 点（二分法で逆 CDF）。
  let lo = -10;
  let hi = 10;
  const target = 1 - alpha;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (standardNormalCdf(mid) < target) lo = mid;
    else hi = mid;
  }
  return mu0 + ((lo + hi) / 2) * se;
}

/**
 * 正規平均（σ既知）の検定統計量 3 種。MLE=x̄、標準化 z=(x̄−μ0)/se。
 * 正規モデルでは Wald・Score・尤度比（−2logΛ）はすべて z² に一致する（厳密に等価）。
 * 一般の分布では漸近的に等価だが有限標本では異なる。
 */
export function threeTestStatistics(params: {
  xbar: number;
  mu0: number;
  sigma: number;
  n: number;
}): { z: number; wald: number; score: number; lrt: number } {
  const { xbar, mu0, sigma, n } = params;
  const se = sigma / Math.sqrt(n);
  const z = (xbar - mu0) / se;
  const stat = z * z;
  return { z, wald: stat, score: stat, lrt: stat };
}

/**
 * 正規モデルの対数尤度（μ の関数, σ既知, 平均 xbar と n で十分）。
 * logL(μ) = −n/(2σ²)·[(xbar−μ)² + 定数]。定数を落とした «μ 依存部分» を返す（相対値）。
 */
export function normalLogLikMu(mu: number, xbar: number, sigma: number, n: number): number {
  return (-n / (2 * sigma * sigma)) * (xbar - mu) ** 2;
}

/** 正規密度（描画用 re-export）。 */
export { normalPdf };
