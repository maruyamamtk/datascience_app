/**
 * 回帰診断（F-3）トピックの計算層（純関数）。
 * 単回帰の残差・てこ比（leverage）・標準化残差・ダービン–ワトソン比・Q–Q プロット点を扱う。
 * 「回帰の前提（線形・等分散・正規・無相関）が崩れていないか」を残差で診断する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。正規分位点は normal.ts を再利用。
 */

import { zQuantile } from "./normal";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** 単回帰の当てはめ（最小二乗）。傾き・切片・予測・残差。 */
export function fitSimple(
  x: readonly number[],
  y: readonly number[],
): { slope: number; intercept: number; fitted: number[]; residuals: number[]; sxx: number } {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const fitted = x.map((xi) => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - fitted[i]);
  return { slope, intercept, fitted, residuals, sxx };
}

/**
 * 各点のてこ比 hᵢ = 1/n + (xᵢ−x̄)²/Sxx（単回帰のハット行列の対角）。
 * x が平均から離れた点ほど大きく、回帰直線を «引っ張る» 力（影響力）の素。0<hᵢ<1、Σhᵢ=2（単回帰）。
 */
export function leverage(x: readonly number[]): number[] {
  const n = x.length;
  const mx = mean(x);
  const sxx = x.reduce((acc, xi) => acc + (xi - mx) ** 2, 0);
  return x.map((xi) => (sxx > 0 ? 1 / n + (xi - mx) ** 2 / sxx : 1 / n));
}

/** 残差標準偏差 s = √(RSS/(n−2))（単回帰, 自由度 n−2）。 */
export function residualSd(residuals: readonly number[]): number {
  const n = residuals.length;
  if (n <= 2) return Number.NaN;
  const rss = residuals.reduce((acc, e) => acc + e * e, 0);
  return Math.sqrt(rss / (n - 2));
}

/** 標準化残差 eᵢ/(s·√(1−hᵢ))。外れ値検出に使う（|値|>2 が目安）。 */
export function standardizedResiduals(
  residuals: readonly number[],
  lev: readonly number[],
): number[] {
  const s = residualSd(residuals);
  return residuals.map((e, i) => {
    const denom = s * Math.sqrt(Math.max(1e-12, 1 - lev[i]));
    return denom > 0 ? e / denom : Number.NaN;
  });
}

/**
 * ダービン–ワトソン比 DW = Σ(eᵢ−eᵢ₋₁)²/Σeᵢ²。系列相関（残差の自己相関）の指標。
 * DW≈2 で無相関、0 に近いと正の系列相関、4 に近いと負の系列相関。
 */
export function durbinWatson(residuals: readonly number[]): number {
  const n = residuals.length;
  if (n < 2) return Number.NaN;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += residuals[i] ** 2;
    if (i > 0) num += (residuals[i] - residuals[i - 1]) ** 2;
  }
  return den > 0 ? num / den : Number.NaN;
}

/**
 * Q–Q プロットの点列。残差を昇順に並べ、理論正規分位点（(i−0.5)/n の z 値）と対にする。
 * 点が直線に乗れば残差は正規。裾が反れば «裾が重い/歪み» を示す。
 */
export function qqPoints(residuals: readonly number[]): { theoretical: number; sample: number }[] {
  const n = residuals.length;
  const s = residualSd(residuals) || 1;
  const sorted = [...residuals].sort((a, b) => a - b);
  return sorted.map((e, i) => ({
    theoretical: zQuantile((i + 0.5) / n),
    sample: e / s, // 標準化して理論分位点と同尺度に
  }));
}
