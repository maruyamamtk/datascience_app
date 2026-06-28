/**
 * 推定法（D-2）トピックの計算層（純関数）。
 * 最尤法（指数分布の率 λ）・モーメント法・最小二乗法の核を純関数で扱う。
 * 「データから母数をどう決めるか」の 3 つの流儀を体感する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。標本平均は sample.ts を再利用する。
 */

import { mean } from "./sample";

export { mean };

/**
 * 指数分布（率 λ）の対数尤度 log L(λ)=n·log λ − λ·Σxᵢ（xᵢ≥0）。
 * λ>0 でのみ定義。λ≤0 は -∞ を避け大きな負値を返す。
 */
export function exponentialLogLikelihood(lambda: number, samples: readonly number[]): number {
  if (lambda <= 0) return -1e12;
  const n = samples.length;
  const sum = samples.reduce((a, b) => a + b, 0);
  return n * Math.log(lambda) - lambda * sum;
}

/** 指数分布の最尤推定量 λ̂ = n/Σxᵢ = 1/x̄（標本平均の逆数）。空・平均0 は NaN。 */
export function exponentialMle(samples: readonly number[]): number {
  const m = mean(samples);
  if (samples.length === 0 || m <= 0) return Number.NaN;
  return 1 / m;
}

/** 対数尤度の λ に関する微分 d/dλ log L = n/λ − Σxᵢ（勾配上昇法の勾配）。 */
export function exponentialScore(lambda: number, samples: readonly number[]): number {
  const n = samples.length;
  const sum = samples.reduce((a, b) => a + b, 0);
  return n / lambda - sum;
}

/** 対数尤度曲線（λ を範囲で刻んだ {lambda, logLik} 列、最大値で正規化した lik も）。 */
export function logLikCurve(
  samples: readonly number[],
  loLambda: number,
  hiLambda: number,
  steps = 100,
): { lambda: number; logLik: number; lik: number }[] {
  const raw: { lambda: number; logLik: number }[] = [];
  let maxLog = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const lambda = loLambda + (i / steps) * (hiLambda - loLambda);
    const logLik = exponentialLogLikelihood(lambda, samples);
    raw.push({ lambda, logLik });
    if (logLik > maxLog) maxLog = logLik;
  }
  return raw.map((r) => ({ ...r, lik: Math.exp(r.logLik - maxLog) }));
}

/** 勾配上昇法の 1 ステップ列（log L を λ について登る）。各ステップの λ と勾配を返す。 */
export function gradientAscentSteps(
  samples: readonly number[],
  start: number,
  lr: number,
  iters: number,
): { lambda: number; score: number; logLik: number }[] {
  const out: { lambda: number; score: number; logLik: number }[] = [];
  let lambda = start;
  for (let i = 0; i <= iters; i++) {
    const score = exponentialScore(lambda, samples);
    out.push({ lambda, score, logLik: exponentialLogLikelihood(lambda, samples) });
    // 学習率は λ² でスケール（ニュートン的に安定化）。λ>0 を保つ。
    lambda = Math.max(1e-3, lambda + lr * lambda * lambda * score);
  }
  return out;
}

/**
 * モーメント法（一様分布 U[0,θ]）の推定量＝ 2·x̄（理論平均 θ/2 に標本平均を一致させる）。
 * 最尤推定量は標本最大値 max(xᵢ)。両者の違いを見せるための対比に使う。
 */
export function uniformMomentEstimate(samples: readonly number[]): number {
  return 2 * mean(samples);
}

/** 一様分布 U[0,θ] の最尤推定量＝標本最大値 max(xᵢ)。空は NaN。 */
export function uniformMaxMle(samples: readonly number[]): number {
  if (samples.length === 0) return Number.NaN;
  return Math.max(...samples);
}

/**
 * 最小二乗法（1 変数の «平均» 推定）: Σ(xᵢ−c)² を最小化する c は標本平均 x̄。
 * 残差平方和 RSS(c)=Σ(xᵢ−c)² を返す（描画・検証用）。
 */
export function residualSumOfSquares(samples: readonly number[], c: number): number {
  return samples.reduce((acc, x) => acc + (x - c) ** 2, 0);
}
