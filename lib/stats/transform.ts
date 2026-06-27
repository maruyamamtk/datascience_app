/**
 * 変数変換と確率変数の線形結合（B-4）トピックの計算層（純関数）。
 * 線形変換 Y=aX+b のモーメント・密度変換（ヤコビアン 1/|a|）と、独立な確率変数の線形結合
 * Z=aX+bY のモーメント、離散分布の畳み込み（和の分布）を純関数で与える。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。正規密度は normal.ts を再利用する。
 */

import { normalPdf } from "./normal";

/** 線形変換 Y=aX+b 後のモーメント。期待値は線形、分散は a² 倍（b は効かない）。 */
export function linearTransformMoments(
  mean: number,
  variance: number,
  a: number,
  b: number,
): { mean: number; variance: number } {
  return { mean: a * mean + b, variance: a * a * variance };
}

/**
 * 変数変換 Y=aX+b の密度 f_Y(y)=f_X((y−b)/a)·|1/a|（a≠0）。
 * |1/a| が**ヤコビアン**（縦を a 倍に伸ばすと、面積=確率を保つため高さは 1/|a| 倍になる）。
 * ここでは X が正規 N(μ,σ²) の場合の f_Y を返す。a=0 は NaN（退化）。
 */
export function linearTransformNormalPdf(
  y: number,
  mu: number,
  sigma: number,
  a: number,
  b: number,
): number {
  if (a === 0) return Number.NaN;
  const x = (y - b) / a;
  return normalPdf(x, mu, sigma) / Math.abs(a);
}

/**
 * 独立な X,Y の線形結合 Z=aX+bY のモーメント。
 * 期待値は常に線形 E[Z]=aμ_X+bμ_Y、分散は独立なら Var[Z]=a²σ_X²+b²σ_Y²（共分散項 0）。
 * 一般には +2ab·Cov(X,Y) が付く（cov 引数で指定可）。
 */
export function linearCombinationMoments(
  meanX: number,
  varX: number,
  meanY: number,
  varY: number,
  a: number,
  b: number,
  cov = 0,
): { mean: number; variance: number } {
  return {
    mean: a * meanX + b * meanY,
    variance: a * a * varX + b * b * varY + 2 * a * b * cov,
  };
}

/**
 * 2 つの離散分布（0 始まりの確率ベクトル）の畳み込み = 独立な和 Z=X+Y の分布。
 * P(Z=k)=Σ_i P(X=i)P(Y=k−i)。出力長は (|X|−1)+(|Y|−1)+1。
 */
export function convolve(px: readonly number[], py: readonly number[]): number[] {
  if (px.length === 0 || py.length === 0) return [];
  const out = new Array(px.length + py.length - 1).fill(0);
  for (let i = 0; i < px.length; i++) {
    for (let j = 0; j < py.length; j++) {
      out[i + j] += px[i] * py[j];
    }
  }
  return out;
}

/** 公正なサイコロ（1..faces）を 0 始まり確率ベクトルにしたもの（index 0 は値 1 に対応しない点に注意、値=index+1）。 */
export function fairDie(faces = 6): number[] {
  return new Array(faces).fill(1 / faces);
}
