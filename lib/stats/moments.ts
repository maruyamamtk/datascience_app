/**
 * 分布の特性値（B-3）トピックの計算層（純関数）。
 * 標本（数直線上の点の集まり）から、期待値・分散・標準偏差・歪度・尖度・変動係数・分位点を求める。
 * 相関係数・偏相関係数・チェビシェフの不等式も純関数として提供する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。
 * 標本平均は既存の `sample.ts` を再利用する（重複実装を避ける）。
 */

import { mean } from "./sample";

export { mean };

/**
 * 中心まわりの k 次モーメント E[(X−μ)^k]（母集団版, 1/n）。
 * k=2 が分散、k=3 が歪度の分子、k=4 が尖度の分子。空配列は NaN。
 */
export function centralMoment(values: readonly number[], k: number): number {
  if (values.length === 0) return Number.NaN;
  const mu = mean(values);
  return values.reduce((acc, v) => acc + (v - mu) ** k, 0) / values.length;
}

/**
 * 分散 σ²。既定は母分散（1/n）。標本分散（不偏, 1/(n−1)）は sample:true で。
 * 母分散は中心 2 次モーメントに一致する。n<2 で sample:true のときは NaN。
 */
export function variance(values: readonly number[], opts: { sample?: boolean } = {}): number {
  const n = values.length;
  if (n === 0) return Number.NaN;
  const mu = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - mu) ** 2, 0);
  if (opts.sample) {
    if (n < 2) return Number.NaN;
    return ss / (n - 1);
  }
  return ss / n;
}

/** 標準偏差 σ = √分散。 */
export function std(values: readonly number[], opts: { sample?: boolean } = {}): number {
  return Math.sqrt(variance(values, opts));
}

/**
 * 歪度（skewness）γ₁ = E[(X−μ)³]/σ³。分布の左右非対称性。
 * 正なら右に裾が長い、負なら左に裾が長い、0 なら対称。σ=0 は NaN。
 */
export function skewness(values: readonly number[]): number {
  const m2 = centralMoment(values, 2);
  const m3 = centralMoment(values, 3);
  const s3 = m2 ** 1.5;
  if (!(s3 > 0)) return Number.NaN;
  return m3 / s3;
}

/**
 * 尖度（excess kurtosis）γ₂ = E[(X−μ)⁴]/σ⁴ − 3。正規分布を基準（0）にした «尖り・裾の重さ»。
 * 正なら裾が重く尖る、負なら平たい。σ=0 は NaN。
 */
export function kurtosisExcess(values: readonly number[]): number {
  const m2 = centralMoment(values, 2);
  const m4 = centralMoment(values, 4);
  const s4 = m2 ** 2;
  if (!(s4 > 0)) return Number.NaN;
  return m4 / s4 - 3;
}

/**
 * 変動係数（coefficient of variation）CV = σ/μ。単位に依らない相対的なばらつき。
 * μ=0 は NaN（基準が 0 で相対化できない）。
 */
export function coefficientOfVariation(values: readonly number[]): number {
  const mu = mean(values);
  if (mu === 0) return Number.NaN;
  return std(values) / mu;
}

/**
 * 標本の分位点関数（0≤q≤1）。線形補間（type-7, R/numpy 既定）で求める。
 * 空配列・範囲外の q は NaN。中央値は quantile(values, 0.5)。
 */
export function quantile(values: readonly number[], q: number): number {
  const n = values.length;
  if (n === 0 || q < 0 || q > 1) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (n === 1) return sorted[0];
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * チェビシェフの不等式の上界 P(|X−μ| ≥ kσ) ≤ 1/k²（k>0）。
 * 分布の形に依らず «平均から kσ 以上離れる確率» を抑える。k≤1 では 1（自明な上界）。
 */
export function chebyshevBound(k: number): number {
  if (k <= 0) return Number.NaN;
  if (k <= 1) return 1;
  return 1 / k ** 2;
}

/**
 * ピアソンの相関係数 r = Cov(X,Y)/(σ_X σ_Y)。−1〜1。
 * 長さ不一致・空・どちらかの分散 0 は NaN。
 */
export function correlation(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n === 0 || n !== ys.length) return Number.NaN;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  if (!(denom > 0)) return Number.NaN;
  return sxy / denom;
}

/**
 * 偏相関係数 r_{XY·Z} = (r_XY − r_XZ r_YZ)/√((1−r_XZ²)(1−r_YZ²))。
 * 第3変数 Z の影響を取り除いた X,Y の相関。分母 0 は NaN。
 */
export function partialCorrelation(rxy: number, rxz: number, ryz: number): number {
  const denom = Math.sqrt((1 - rxz ** 2) * (1 - ryz ** 2));
  if (!(denom > 0)) return Number.NaN;
  return (rxy - rxz * ryz) / denom;
}

/** 分布の特性値ラボの操作値（数直線上の標本点）。 */
export type MomentControls = {
  /** 標本点の値（ドラッグで動かす）。 */
  points: number[];
};

/** 分布の特性値ラボの派生値（controls から純関数で再計算）。 */
export type MomentDerived = {
  /** 期待値 μ（重心）。 */
  mean: number;
  /** 母分散 σ²。 */
  variance: number;
  /** 標準偏差 σ。 */
  std: number;
  /** 歪度 γ₁。 */
  skewness: number;
  /** 超過尖度 γ₂。 */
  kurtosis: number;
  /** 変動係数 CV = σ/μ。 */
  cv: number;
};

/** 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。 */
export function deriveMoments({ points }: MomentControls): MomentDerived {
  return {
    mean: mean(points),
    variance: variance(points),
    std: std(points),
    skewness: skewness(points),
    kurtosis: kurtosisExcess(points),
    cv: coefficientOfVariation(points),
  };
}
