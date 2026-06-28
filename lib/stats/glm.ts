/**
 * 一般化線形モデル（F-5）トピックの計算層（純関数）。
 * ポアソン回帰（対数リンク）を具体例に、リンク関数・指数型分布族・対数尤度・デビアンスを扱う。
 * 「線形予測子 + リンク関数 + 分布」でさまざまな応答型を統一する GLM の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** GLM の «族»（分布＋標準リンク）の種類。 */
export type GlmFamily = "gaussian" | "binomial" | "poisson";

/** 各族の標準リンク関数 g（平均 μ → 線形予測子 η）。 */
export function linkFn(family: GlmFamily, mu: number): number {
  switch (family) {
    case "gaussian":
      return mu; // 恒等リンク
    case "binomial":
      return Math.log(mu / (1 - mu)); // ロジット
    case "poisson":
      return Math.log(mu); // 対数リンク
  }
}

/** 各族の逆リンク（線形予測子 η → 平均 μ）。 */
export function inverseLink(family: GlmFamily, eta: number): number {
  switch (family) {
    case "gaussian":
      return eta;
    case "binomial":
      return 1 / (1 + Math.exp(-eta));
    case "poisson":
      return Math.exp(eta);
  }
}

/** ポアソン回帰の平均 λ=exp(b0+b1·x)（対数リンクの逆）。 */
export function poissonMean(x: number, b0: number, b1: number): number {
  return Math.exp(b0 + b1 * x);
}

/** ln(n!) を対数ガンマ近似なしの直接和で（小さい n 向け）。 */
function lnFactorial(n: number): number {
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log(k);
  return s;
}

/** ポアソン回帰の対数尤度 Σ[yᵢ·log λᵢ − λᵢ − log(yᵢ!)]。 */
export function poissonLogLikelihood(
  x: readonly number[],
  y: readonly number[],
  b0: number,
  b1: number,
): number {
  let ll = 0;
  for (let i = 0; i < x.length; i++) {
    const lam = poissonMean(x[i], b0, b1);
    ll += y[i] * Math.log(lam) - lam - lnFactorial(Math.round(y[i]));
  }
  return ll;
}

/**
 * ポアソン回帰を勾配上昇で1ステップ。勾配は ∂ℓ/∂b0=Σ(yᵢ−λᵢ)、∂ℓ/∂b1=Σ(yᵢ−λᵢ)xᵢ。
 * （対数リンクの標準型。残差 yᵢ−λᵢ が重み付けされる形はロジスティックと同じ «一般化» の構造。）
 */
export function poissonGradientStep(
  x: readonly number[],
  y: readonly number[],
  b0: number,
  b1: number,
  lr: number,
): { b0: number; b1: number } {
  let g0 = 0;
  let g1 = 0;
  for (let i = 0; i < x.length; i++) {
    const lam = poissonMean(x[i], b0, b1);
    const r = y[i] - lam;
    g0 += r;
    g1 += r * x[i];
  }
  const n = x.length || 1;
  return { b0: b0 + (lr * g0) / n, b1: b1 + (lr * g1) / n };
}

/** ポアソン回帰の最尤当てはめ（勾配上昇）。各ステップの (b0,b1,logLik) を返す。 */
export function fitPoisson(
  x: readonly number[],
  y: readonly number[],
  opts: { b0?: number; b1?: number; lr?: number; iters?: number } = {},
): { b0: number; b1: number; logLik: number }[] {
  let { b0 = 0, b1 = 0 } = opts;
  const { lr = 0.05, iters = 200 } = opts;
  const out: { b0: number; b1: number; logLik: number }[] = [];
  for (let i = 0; i <= iters; i++) {
    out.push({ b0, b1, logLik: poissonLogLikelihood(x, y, b0, b1) });
    ({ b0, b1 } = poissonGradientStep(x, y, b0, b1, lr));
  }
  return out;
}

/**
 * デビアンス D=2(ℓ_飽和−ℓ_モデル)。ポアソンでは 2Σ[yᵢ·log(yᵢ/λᵢ)−(yᵢ−λᵢ)]。
 * モデルの «当てはまりの悪さ»。小さいほど良い。線形回帰の残差平方和の一般化。
 */
export function poissonDeviance(
  x: readonly number[],
  y: readonly number[],
  b0: number,
  b1: number,
): number {
  let d = 0;
  for (let i = 0; i < x.length; i++) {
    const lam = poissonMean(x[i], b0, b1);
    const yi = y[i];
    const term = yi > 0 ? yi * Math.log(yi / lam) - (yi - lam) : lam;
    d += term;
  }
  return 2 * d;
}

/**
 * ポアソン分布に従うカウントデータ生成。平均 λ=exp(b0+b1·x) から各 x で y を引く。
 * 決定的 PRNG（Knuth のアルゴリズム）で再現可能。
 */
export function generateCountData(params: {
  n: number;
  b0: number;
  b1: number;
  xMin: number;
  xMax: number;
  rng: Rng;
}): { x: number[]; y: number[] } {
  const { n, b0, b1, xMin, xMax, rng } = params;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = xMin + (xMax - xMin) * (i / (n - 1));
    const lam = poissonMean(xi, b0, b1);
    // Knuth のポアソン乱数。
    const L = Math.exp(-lam);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    x.push(xi);
    y.push(k - 1);
  }
  return { x, y };
}
