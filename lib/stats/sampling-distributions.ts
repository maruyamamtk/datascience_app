/**
 * 標本分布（C-3）トピックの計算層（純関数）。
 * t 分布・カイ二乗分布・F 分布の確率密度関数（PDF）と理論平均・分散を、共通インターフェースで与える。
 * これらは «正規母集団から標本を取ったときの統計量» の分布で、検定・区間推定の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 * ガンマ関数 lnGamma・ガンマ密度は continuous.ts、標準正規密度は normal.ts を再利用する。
 */

import { gammaPdf, lnGamma } from "./continuous";
import { normalPdf } from "./normal";

/** カイ二乗分布（自由度 k）の密度＝ガンマ Gamma(k/2, 2)。平均 k、分散 2k。 */
export function chiSquarePdf(x: number, k: number): number {
  if (x < 0) return 0;
  return gammaPdf(x, k / 2, 2);
}

/**
 * t 分布（自由度 ν）の密度。標準正規を独立な √(χ²_ν/ν) で割った量の分布。
 * f(t)=Γ((ν+1)/2)/(√(νπ)Γ(ν/2)) (1+t²/ν)^{-(ν+1)/2}。ν→∞ で標準正規。
 */
export function tPdf(t: number, nu: number): number {
  const logC = lnGamma((nu + 1) / 2) - 0.5 * Math.log(nu * Math.PI) - lnGamma(nu / 2);
  return Math.exp(logC) * (1 + (t * t) / nu) ** (-(nu + 1) / 2);
}

/**
 * F 分布（自由度 d1, d2）の密度。2 つの独立なカイ二乗を自由度で割った比 (χ²_{d1}/d1)/(χ²_{d2}/d2)。
 * 分散分析・等分散検定で «分散の比» の分布として現れる。x≥0。
 */
export function fPdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const logNum = (d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x);
  const logDen = ((d1 + d2) / 2) * Math.log(1 + (d1 / d2) * x);
  const logBeta = lnGamma(d1 / 2) + lnGamma(d2 / 2) - lnGamma((d1 + d2) / 2);
  return Math.exp(logNum - logDen - logBeta);
}

/** 標本分布の種別。 */
export type SamplingKind = "t" | "chiSquare" | "f";

/** 種別ごとのパラメータ（自由度）。 */
export type SamplingParams = {
  /** t・カイ二乗の自由度 / F の第1自由度。 */
  df1: number;
  /** F の第2自由度。 */
  df2: number;
};

/** 分布のメタ情報（表示名・平均・分散・PDF・描画レンジ）。平均/分散が存在しない場合は NaN。 */
export type SamplingSpec = {
  kind: SamplingKind;
  label: string;
  paramText: (pr: SamplingParams) => string;
  mean: (pr: SamplingParams) => number;
  variance: (pr: SamplingParams) => number;
  pdf: (x: number, pr: SamplingParams) => number;
  range: (pr: SamplingParams) => [number, number];
};

export const SAMPLING_SPECS: Record<SamplingKind, SamplingSpec> = {
  t: {
    kind: "t",
    label: "t 分布",
    paramText: (pr) => `t(ν=${pr.df1})`,
    mean: (pr) => (pr.df1 > 1 ? 0 : Number.NaN),
    variance: (pr) => (pr.df1 > 2 ? pr.df1 / (pr.df1 - 2) : Number.NaN),
    pdf: (x, pr) => tPdf(x, pr.df1),
    range: () => [-5, 5],
  },
  chiSquare: {
    kind: "chiSquare",
    label: "カイ二乗分布",
    paramText: (pr) => `χ²(k=${pr.df1})`,
    mean: (pr) => pr.df1,
    variance: (pr) => 2 * pr.df1,
    pdf: (x, pr) => chiSquarePdf(x, pr.df1),
    range: (pr) => [0, Math.max(10, pr.df1 + 4 * Math.sqrt(2 * pr.df1))],
  },
  f: {
    kind: "f",
    label: "F 分布",
    paramText: (pr) => `F(${pr.df1}, ${pr.df2})`,
    mean: (pr) => (pr.df2 > 2 ? pr.df2 / (pr.df2 - 2) : Number.NaN),
    variance: (pr) =>
      pr.df2 > 4
        ? (2 * pr.df2 * pr.df2 * (pr.df1 + pr.df2 - 2)) /
          (pr.df1 * (pr.df2 - 2) ** 2 * (pr.df2 - 4))
        : Number.NaN,
    pdf: (x, pr) => fPdf(x, pr.df1, pr.df2),
    range: () => [0, 5],
  },
};

/** 種別とパラメータから PDF のサンプル点列を作る（描画用）。 */
export function samplingCurve(
  kind: SamplingKind,
  pr: SamplingParams,
  samples = 160,
): { x: number; y: number }[] {
  const spec = SAMPLING_SPECS[kind];
  const [lo, hi] = spec.range(pr);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = lo + (i / samples) * (hi - lo);
    const y = spec.pdf(x, pr);
    out.push({ x, y: Number.isFinite(y) ? y : 0 });
  }
  return out;
}

/** 標準正規密度（t 分布の極限の比較用に re-export）。 */
export { normalPdf };
