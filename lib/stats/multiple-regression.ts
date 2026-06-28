/**
 * 重回帰分析（F-2）トピックの計算層（純関数）。
 * 正規方程式 β=(XᵀX)⁻¹Xᵀy による最小二乗、決定係数・自由度調整済み決定係数、係数の標準誤差、
 * 多重共線性の VIF を扱う。多重共線性が «係数のばらつき» を膨らませる様子を体感する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。行列演算は linalg.ts を再利用。
 */

import { inverse, matMul, matVec, transpose, type Matrix } from "./linalg";
import { normalSample } from "./normal";
import type { Rng } from "./random";

/** 重回帰の当てはめ結果。 */
export type OlsFit = {
  /** 係数ベクトル（先頭が切片）。 */
  coefficients: number[];
  /** 予測値。 */
  fitted: number[];
  /** 残差。 */
  residuals: number[];
  /** 残差平方和。 */
  rss: number;
  /** 全平方和。 */
  tss: number;
  /** 決定係数 R²。 */
  rSquared: number;
  /** 自由度調整済み決定係数。 */
  adjustedRSquared: number;
  /** 各係数の標準誤差（先頭が切片）。 */
  standardErrors: number[];
};

/** 平均。 */
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * 計画行列 X（各行が観測、列に切片1＋説明変数）と応答 y から OLS を当てはめる。
 * 正規方程式 β=(XᵀX)⁻¹Xᵀy。XᵀX が特異（完全な多重共線性）なら係数は NaN。
 * p = 説明変数の数（切片を除く）、自由度 n−p−1。
 */
export function olsFit(X: Matrix, y: readonly number[]): OlsFit {
  const n = X.length;
  const cols = X[0]?.length ?? 0; // 切片含む列数
  const p = cols - 1; // 説明変数の数
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = inverse(XtX);
  const Xty = matVec(Xt, y as number[]);

  const coefficients = XtXinv ? matVec(XtXinv, Xty) : new Array(cols).fill(Number.NaN);
  const fitted = X.map((row) => row.reduce((acc, v, j) => acc + v * coefficients[j], 0));
  const residuals = y.map((yi, i) => yi - fitted[i]);
  const rss = residuals.reduce((acc, r) => acc + r * r, 0);
  const ybar = mean(y);
  const tss = y.reduce((acc, yi) => acc + (yi - ybar) ** 2, 0);
  const rSquared = tss > 0 ? 1 - rss / tss : Number.NaN;
  const dfResid = n - p - 1;
  const adjustedRSquared =
    dfResid > 0 && tss > 0 ? 1 - rss / dfResid / (tss / (n - 1)) : Number.NaN;

  // 係数の分散共分散 = σ̂²·(XᵀX)⁻¹、σ̂²=RSS/(n−p−1)。
  const sigma2 = dfResid > 0 ? rss / dfResid : Number.NaN;
  const standardErrors = XtXinv
    ? XtXinv.map((row, i) => Math.sqrt(Math.max(0, sigma2 * row[i])))
    : new Array(cols).fill(Number.NaN);

  return { coefficients, fitted, residuals, rss, tss, rSquared, adjustedRSquared, standardErrors };
}

/** 説明変数の列だけ（切片なし）から計画行列 X=[1, cols...] を作る。 */
export function designMatrix(columns: readonly number[][]): Matrix {
  const n = columns[0]?.length ?? 0;
  return Array.from({ length: n }, (_, i) => [1, ...columns.map((c) => c[i])]);
}

/**
 * 分散拡大係数 VIF_j = 1/(1−R²_j)。R²_j は «説明変数 j を他の説明変数で回帰した» 決定係数。
 * 多重共線性の指標。2 変数なら VIF=1/(1−r₁₂²)。10 以上で «強い多重共線性» の目安。
 */
export function vif(columns: readonly number[][], j: number): number {
  const others = columns.filter((_, idx) => idx !== j);
  if (others.length === 0) return 1;
  const X = designMatrix(others);
  const fit = olsFit(X, columns[j]);
  const r2 = fit.rSquared;
  if (!(r2 < 1)) return Number.POSITIVE_INFINITY;
  return 1 / (1 - r2);
}

/**
 * 多重共線性デモ用データ生成。x1 は標準正規、x2 は «x1 と相関 rho» になるように作る
 * （x2 = rho·x1 + √(1−rho²)·noise）。y = b1·x1 + b2·x2 + 誤差。決定的 PRNG で再現可能。
 */
export function generateCollinearData(params: {
  n: number;
  rho: number;
  b1: number;
  b2: number;
  noise: number;
  rng: Rng;
}): { x1: number[]; x2: number[]; y: number[] } {
  const { n, rho, b1, b2, noise, rng } = params;
  const x1: number[] = [];
  const x2: number[] = [];
  const y: number[] = [];
  const s = Math.sqrt(Math.max(0, 1 - rho * rho));
  for (let i = 0; i < n; i++) {
    const a = normalSample(0, 1, rng);
    const e = normalSample(0, 1, rng);
    const v1 = a;
    const v2 = rho * a + s * e;
    x1.push(v1);
    x2.push(v2);
    y.push(b1 * v1 + b2 * v2 + normalSample(0, noise, rng));
  }
  return { x1, x2, y };
}
