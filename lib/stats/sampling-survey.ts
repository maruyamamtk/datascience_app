/**
 * 標本調査法（G-2）トピックの計算層（純関数）。
 * 単純無作為抽出・層化抽出の推定量と分散、有限母集団修正、層化による分散低減を扱う。
 * 「母集団からどう標本を取れば、少ない労力で正確に母平均を推定できるか」の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** 母集団の «層»（部分集団）。 */
export type Stratum = {
  /** 層の名前。 */
  name: string;
  /** 層サイズ N_h。 */
  size: number;
  /** 層内平均 μ_h。 */
  mean: number;
  /** 層内標準偏差 σ_h。 */
  sd: number;
};

/** 母平均 = Σ N_h μ_h / N（層の重み付き平均）。 */
export function populationMean(strata: readonly Stratum[]): number {
  const N = strata.reduce((a, s) => a + s.size, 0);
  if (N === 0) return 0;
  return strata.reduce((a, s) => a + s.size * s.mean, 0) / N;
}

/**
 * 単純無作為抽出（SRS）の標本平均の分散 Var = (σ²/n)·(1 − n/N)（有限母集団修正つき）。
 * σ² は母分散（層を混ぜた全体の分散＝層内＋層間）。
 */
export function srsVariance(strata: readonly Stratum[], n: number): number {
  const N = strata.reduce((a, s) => a + s.size, 0);
  const sigma2 = populationVariance(strata);
  if (n <= 0 || N === 0) return Number.NaN;
  const fpc = 1 - n / N; // 有限母集団修正
  return (sigma2 / n) * fpc;
}

/** 母分散 σ² = 層内分散の重み付き和 + 層間分散（分散分解）。 */
export function populationVariance(strata: readonly Stratum[]): number {
  const N = strata.reduce((a, s) => a + s.size, 0);
  if (N === 0) return 0;
  const mu = populationMean(strata);
  let within = 0;
  let between = 0;
  for (const s of strata) {
    const w = s.size / N;
    within += w * s.sd * s.sd;
    between += w * (s.mean - mu) ** 2;
  }
  return within + between;
}

/** 層内分散の重み付き和（層化推定量の分散の主要項）。 */
export function withinStrataVariance(strata: readonly Stratum[]): number {
  const N = strata.reduce((a, s) => a + s.size, 0);
  if (N === 0) return 0;
  return strata.reduce((a, s) => a + (s.size / N) * s.sd * s.sd, 0);
}

/** 比例配分: 各層の標本サイズ n_h = n · (N_h/N)。 */
export function proportionalAllocation(strata: readonly Stratum[], n: number): number[] {
  const N = strata.reduce((a, s) => a + s.size, 0);
  return strata.map((s) => (N > 0 ? n * (s.size / N) : 0));
}

/** ネイマン配分: n_h ∝ N_h σ_h（層内のばらつきが大きい層に多く配分）。 */
export function neymanAllocation(strata: readonly Stratum[], n: number): number[] {
  const denom = strata.reduce((a, s) => a + s.size * s.sd, 0);
  return strata.map((s) => (denom > 0 ? (n * s.size * s.sd) / denom : 0));
}

/**
 * 層化無作為抽出の標本平均の分散。各層から n_h を取り、推定量 Σ W_h ȳ_h の分散
 * Var = Σ W_h² (σ_h²/n_h)(1 − n_h/N_h)（有限母集団修正つき）。
 * allocation は各層の標本サイズ。
 */
export function stratifiedVariance(
  strata: readonly Stratum[],
  allocation: readonly number[],
): number {
  const N = strata.reduce((a, s) => a + s.size, 0);
  if (N === 0) return Number.NaN;
  let v = 0;
  strata.forEach((s, h) => {
    const nh = allocation[h];
    if (nh <= 0) return;
    const W = s.size / N;
    const fpc = 1 - nh / s.size;
    v += W * W * ((s.sd * s.sd) / nh) * fpc;
  });
  return v;
}

/**
 * 単純無作為抽出を1回行い標本平均を返す（層を母集団に展開して非復元抽出）。
 * 各層内は正規近似で値を生成（決定的 PRNG）。
 */
export function drawSrsMean(strata: readonly Stratum[], n: number, rng: Rng): number {
  // 母集団を層から正規生成して作る。
  const pop: number[] = [];
  for (const s of strata) {
    for (let i = 0; i < s.size; i++) {
      pop.push(boxMuller(s.mean, s.sd, rng));
    }
  }
  // 非復元で n 個取る（部分シャッフル）。
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pop.length - i));
    [pop[i], pop[j]] = [pop[j], pop[i]];
  }
  return mean(pop.slice(0, n));
}

/** ボックス–ミュラー法で正規乱数（標本調査の母集団生成用）。 */
function boxMuller(mu: number, sd: number, rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
