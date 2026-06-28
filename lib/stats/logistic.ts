/**
 * 質的回帰（F-4）トピックの計算層（純関数）。
 * ロジスティック回帰のシグモイド・対数オッズ・オッズ比、対数尤度と勾配上昇による当てはめを扱う。
 * 「2値の結果（0/1）の確率を説明変数で予測する」回帰の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** シグモイド関数 σ(z)=1/(1+e^{−z})。線形の z を 0〜1 の確率へ写す。 */
export function sigmoid(z: number): number {
  // 数値安定化（大きな |z| で exp が発散しないように）。
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** ロジット（対数オッズ）logit(p)=log(p/(1−p))。シグモイドの逆関数。 */
export function logit(p: number): number {
  const pc = Math.max(1e-12, Math.min(1 - 1e-12, p));
  return Math.log(pc / (1 - pc));
}

/** 予測確率 P(y=1|x)=σ(b0+b1·x)。 */
export function logisticPredict(x: number, b0: number, b1: number): number {
  return sigmoid(b0 + b1 * x);
}

/** オッズ比 e^{b1}：x が1増えるとオッズが何倍になるか。 */
export function oddsRatio(b1: number): number {
  return Math.exp(b1);
}

/** ロジスティック回帰の対数尤度 Σ[yᵢ·logpᵢ+(1−yᵢ)·log(1−pᵢ)]。 */
export function logLikelihood(
  x: readonly number[],
  y: readonly number[],
  b0: number,
  b1: number,
): number {
  let ll = 0;
  for (let i = 0; i < x.length; i++) {
    const p = logisticPredict(x[i], b0, b1);
    const pc = Math.max(1e-12, Math.min(1 - 1e-12, p));
    ll += y[i] * Math.log(pc) + (1 - y[i]) * Math.log(1 - pc);
  }
  return ll;
}

/**
 * 勾配上昇法でロジスティック回帰を1ステップ進める純関数。
 * 勾配は ∂ℓ/∂b0=Σ(yᵢ−pᵢ)、∂ℓ/∂b1=Σ(yᵢ−pᵢ)xᵢ。学習率 lr で更新した新しい (b0,b1) を返す。
 */
export function gradientStep(
  x: readonly number[],
  y: readonly number[],
  b0: number,
  b1: number,
  lr: number,
): { b0: number; b1: number } {
  let g0 = 0;
  let g1 = 0;
  for (let i = 0; i < x.length; i++) {
    const p = logisticPredict(x[i], b0, b1);
    const r = y[i] - p;
    g0 += r;
    g1 += r * x[i];
  }
  const n = x.length || 1;
  return { b0: b0 + (lr * g0) / n, b1: b1 + (lr * g1) / n };
}

/** 勾配上昇法で最尤当てはめ（収束まで反復）。各ステップの (b0,b1,logLik) を返す。 */
export function fitLogistic(
  x: readonly number[],
  y: readonly number[],
  opts: { b0?: number; b1?: number; lr?: number; iters?: number } = {},
): { b0: number; b1: number; logLik: number }[] {
  let { b0 = 0, b1 = 0 } = opts;
  const { lr = 0.3, iters = 200 } = opts;
  const out: { b0: number; b1: number; logLik: number }[] = [];
  for (let i = 0; i <= iters; i++) {
    out.push({ b0, b1, logLik: logLikelihood(x, y, b0, b1) });
    ({ b0, b1 } = gradientStep(x, y, b0, b1, lr));
  }
  return out;
}

/**
 * 2値データ生成。真の (b0,b1) のロジスティックモデルから x ごとに y∈{0,1} を引く。
 * x は [xMin,xMax] 一様。決定的 PRNG で再現可能。
 */
export function generateBinaryData(params: {
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
    const xi = xMin + (xMax - xMin) * rng();
    const p = logisticPredict(xi, b0, b1);
    x.push(xi);
    y.push(rng() < p ? 1 : 0);
  }
  return { x, y };
}
