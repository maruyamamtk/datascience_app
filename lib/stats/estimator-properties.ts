/**
 * 点推定の性質（D-3）トピックの計算層（純関数）。
 * 推定量の «良さ» を測る量——バイアス・分散・平均二乗誤差（MSE）とそのバイアス分散分解——を扱い、
 * «1/n の標本分散（偏り）» と «1/(n−1) の不偏分散» の標本分布をシミュレーションで比較する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。正規乱数は normal.ts を再利用する。
 */

import { normalSample } from "./normal";
import type { Rng } from "./random";
import { mean } from "./sample";

/** 偏った標本分散 S²ₙ = (1/n)Σ(xᵢ−x̄)²（最尤推定量, σ² を下に偏って推定）。 */
export function sampleVarianceBiased(xs: readonly number[]): number {
  const n = xs.length;
  if (n === 0) return Number.NaN;
  const m = mean(xs);
  return xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / n;
}

/** 不偏標本分散 s² = (1/(n−1))Σ(xᵢ−x̄)²（E[s²]=σ²）。n<2 は NaN。 */
export function sampleVarianceUnbiased(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return Number.NaN;
  const m = mean(xs);
  return xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (n - 1);
}

/** 推定値の集合の «バイアス» E[θ̂]−θ（標本平均で近似）。 */
export function bias(estimates: readonly number[], trueValue: number): number {
  return mean(estimates) - trueValue;
}

/** 推定値の «分散»（母分散, 1/m）。推定量のばらつき。 */
export function estimatorVariance(estimates: readonly number[]): number {
  const m = mean(estimates);
  return estimates.reduce((acc, e) => acc + (e - m) ** 2, 0) / estimates.length;
}

/** 平均二乗誤差 MSE = E[(θ̂−θ)²]（推定値集合から直接計算）。 */
export function meanSquaredError(estimates: readonly number[], trueValue: number): number {
  return estimates.reduce((acc, e) => acc + (e - trueValue) ** 2, 0) / estimates.length;
}

/** バイアス分散分解 MSE = バイアス² + 分散（恒等式）。検証・表示用に各項を返す。 */
export function biasVarianceDecomposition(
  estimates: readonly number[],
  trueValue: number,
): { mse: number; biasSq: number; variance: number } {
  const b = bias(estimates, trueValue);
  return {
    mse: meanSquaredError(estimates, trueValue),
    biasSq: b * b,
    variance: estimatorVariance(estimates),
  };
}

/** 2 つの推定量の相対効率 Var(θ̂₂)/Var(θ̂₁)（1 より大きいほど θ̂₁ が効率的）。 */
export function relativeEfficiency(var1: number, var2: number): number {
  if (var1 <= 0) return Number.NaN;
  return var2 / var1;
}

/** シミュレーションの 1 推定量分の結果。 */
export type EstimatorSamplingResult = {
  /** 各試行の推定値。 */
  estimates: number[];
  /** バイアス。 */
  bias: number;
  /** 分散。 */
  variance: number;
  /** MSE。 */
  mse: number;
};

/**
 * 母集団 N(μ,σ²) から «サイズ n の標本» を trials 回引き、各標本で偏り/不偏の標本分散を計算した
 * 標本分布を返す純関数。真値 σ² と比べてバイアス・分散・MSE を出す。決定的 PRNG で再現可能。
 */
export function simulateVarianceEstimators(params: {
  mu: number;
  sigma: number;
  n: number;
  trials: number;
  rng: Rng;
}): { trueVar: number; biased: EstimatorSamplingResult; unbiased: EstimatorSamplingResult } {
  const { mu, sigma, n, trials, rng } = params;
  const trueVar = sigma * sigma;
  const biasedEst: number[] = [];
  const unbiasedEst: number[] = [];
  for (let t = 0; t < Math.max(0, Math.floor(trials)); t++) {
    const sample: number[] = [];
    for (let i = 0; i < Math.max(0, Math.floor(n)); i++) sample.push(normalSample(mu, sigma, rng));
    biasedEst.push(sampleVarianceBiased(sample));
    unbiasedEst.push(sampleVarianceUnbiased(sample));
  }
  const pack = (estimates: number[]): EstimatorSamplingResult => ({
    estimates,
    bias: bias(estimates, trueVar),
    variance: estimatorVariance(estimates),
    mse: meanSquaredError(estimates, trueVar),
  });
  return { trueVar, biased: pack(biasedEst), unbiased: pack(unbiasedEst) };
}
