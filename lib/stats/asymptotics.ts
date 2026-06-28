/**
 * 推定量の漸近的性質（D-4）トピックの計算層（純関数）。
 * フィッシャー情報量・最尤推定量の漸近正規性・カルバック–ライブラー情報量・ジャックナイフを扱う。
 * 「n を増やすと最尤推定量はどんな分布に近づくか」を体感する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。指数分布の最尤は estimation.ts を再利用。
 */

import { exponentialMle } from "./estimation";
import type { Rng } from "./random";

/** 指数分布（率 λ）の1観測あたりフィッシャー情報量 I(λ)=1/λ²。n 観測では n·I(λ)。 */
export function exponentialFisherInfo(lambda: number): number {
  if (lambda <= 0) return Number.NaN;
  return 1 / (lambda * lambda);
}

/**
 * 最尤推定量 λ̂ の漸近分散 = 1/(n·I(λ)) = λ²/n（クラメール–ラオ下限を達成）。
 * 漸近的に λ̂ ≈ N(λ, λ²/n)。n→∞ で 0 へ（一致性）。
 */
export function mleAsymptoticVariance(lambda: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return 1 / (n * exponentialFisherInfo(lambda));
}

/**
 * 指数分布 Exp(trueLambda) から サイズ n の標本を trials 回引き、各標本の最尤推定 λ̂=1/x̄ を集めた
 * 標本分布を返す純関数。漸近正規性 λ̂≈N(λ, λ²/n) の «体感» に使う。決定的 PRNG で再現可能。
 */
export function simulateMleSampling(params: {
  trueLambda: number;
  n: number;
  trials: number;
  rng: Rng;
}): { estimates: number[]; mean: number; variance: number } {
  const { trueLambda, n, trials, rng } = params;
  const estimates: number[] = [];
  for (let t = 0; t < Math.max(0, Math.floor(trials)); t++) {
    const sample: number[] = [];
    // Exp(λ)=逆関数法: X=-ln(1-U)/λ。normalSample は使わず指数を直接引く。
    for (let i = 0; i < Math.max(0, Math.floor(n)); i++) {
      sample.push(-Math.log(1 - rng()) / trueLambda);
    }
    estimates.push(exponentialMle(sample));
  }
  const m = estimates.reduce((a, b) => a + b, 0) / (estimates.length || 1);
  const v = estimates.reduce((a, b) => a + (b - m) ** 2, 0) / (estimates.length || 1);
  return { estimates, mean: m, variance: v };
}

/**
 * 2 つの指数分布間のカルバック–ライブラー情報量 KL(Exp(λ₁)‖Exp(λ₂))=log(λ₁/λ₂)+λ₂/λ₁−1。
 * 「真の分布 λ₁ を λ₂ で近似したときの情報損失」。λ₁=λ₂ で 0、ずれるほど大きい（非対称）。
 */
export function klExponential(lambda1: number, lambda2: number): number {
  if (lambda1 <= 0 || lambda2 <= 0) return Number.NaN;
  return Math.log(lambda1 / lambda2) + lambda2 / lambda1 - 1;
}

/** 標準正規密度（漸近正規の比較曲線用に薄く再実装、依存を増やさない）。 */
export function stdNormalPdf(z: number): number {
  return Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
}

/**
 * ジャックナイフ（leave-one-out）でバイアスと分散を推定する純関数。
 * 統計量 stat を全体と «1 個抜き» で計算し、擬似値からバイアス・分散を出す。
 * @returns biasEstimate=(n−1)(θ̄(·)−θ̂)、varianceEstimate=ジャックナイフ分散。
 */
export function jackknife(
  samples: readonly number[],
  stat: (xs: readonly number[]) => number,
): { estimate: number; biasEstimate: number; varianceEstimate: number } {
  const n = samples.length;
  const full = stat(samples);
  if (n < 2) return { estimate: full, biasEstimate: Number.NaN, varianceEstimate: Number.NaN };
  const loo: number[] = [];
  for (let i = 0; i < n; i++) {
    const subset = samples.filter((_, j) => j !== i);
    loo.push(stat(subset));
  }
  const mean = loo.reduce((a, b) => a + b, 0) / n;
  const biasEstimate = (n - 1) * (mean - full);
  const varianceEstimate = ((n - 1) / n) * loo.reduce((a, b) => a + (b - mean) ** 2, 0);
  return { estimate: full, biasEstimate, varianceEstimate };
}
