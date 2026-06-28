/**
 * 正規分布に関する検定（E-3）トピックの計算層（純関数）。
 * 1標本・2標本の t 検定、母分散のカイ二乗検定、母相関係数の t 検定を扱う。
 * 「平均の差は偶然か」を検定統計量と p 値で判断する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。t/χ² の密度は sampling-distributions を再利用。
 */

import { chiSquarePdf, tPdf } from "./sampling-distributions";

/**
 * t 分布（自由度 df）の累積分布関数 F(t)=P(T≤t)。tPdf をシンプソン則で数値積分。
 * 対称性 F(−t)=1−F(t) を使い、t≥0 側だけ積分する。
 */
export function tCdf(t: number, df: number): number {
  if (t === 0) return 0.5;
  const x = Math.abs(t);
  // 0..x をシンプソン則（偶数分割）で積分。
  const n = 400;
  const h = x / n;
  let s = tPdf(0, df) + tPdf(x, df);
  for (let i = 1; i < n; i++) {
    s += (i % 2 === 1 ? 4 : 2) * tPdf(i * h, df);
  }
  const area = (h / 3) * s; // P(0≤T≤x)
  const cdfPos = 0.5 + area;
  return t > 0 ? cdfPos : 1 - cdfPos;
}

/** 両側 t 検定の p 値 p=2·P(T≥|t|)=2(1−F(|t|))。 */
export function tTestPValue(t: number, df: number): number {
  return 2 * (1 - tCdf(Math.abs(t), df));
}

/** 1標本 t 統計量 t=(x̄−μ0)/(s/√n)、自由度 n−1。 */
export function oneSampleT(
  xbar: number,
  mu0: number,
  s: number,
  n: number,
): { t: number; df: number } {
  return { t: (xbar - mu0) / (s / Math.sqrt(n)), df: n - 1 };
}

/**
 * 2標本 t 検定（プールした分散を仮定, 等分散）。
 * sp² = ((n1−1)s1²+(n2−1)s2²)/(n1+n2−2)、t=(x̄1−x̄2)/(sp·√(1/n1+1/n2))、df=n1+n2−2。
 */
export function twoSampleT(params: {
  mean1: number;
  mean2: number;
  s1: number;
  s2: number;
  n1: number;
  n2: number;
}): { t: number; df: number; pooledSd: number; se: number } {
  const { mean1, mean2, s1, s2, n1, n2 } = params;
  const df = n1 + n2 - 2;
  const pooledVar = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df;
  const pooledSd = Math.sqrt(pooledVar);
  const se = pooledSd * Math.sqrt(1 / n1 + 1 / n2);
  return { t: (mean1 - mean2) / se, df, pooledSd, se };
}

/**
 * 母相関係数の検定 t=r·√((n−2)/(1−r²))、自由度 n−2。H0: ρ=0。
 * |r| が大きい・n が大きいほど t が大きく、有意になりやすい。
 */
export function correlationT(r: number, n: number): { t: number; df: number } {
  const df = n - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r);
  return { t, df };
}

/** 母分散のカイ二乗検定統計量 χ²=(n−1)s²/σ0²、自由度 n−1。H0: σ²=σ0²。 */
export function varianceChiSquare(
  s2: number,
  sigma0Sq: number,
  n: number,
): { chi2: number; df: number } {
  return { chi2: ((n - 1) * s2) / sigma0Sq, df: n - 1 };
}

/** t 分布の密度曲線（描画用, [-xr,xr]）。 */
export function tCurve(df: number, xr = 5, samples = 120): { x: number; y: number }[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = -xr + (i / samples) * (2 * xr);
    return { x, y: tPdf(x, df) };
  });
}

export { chiSquarePdf };
