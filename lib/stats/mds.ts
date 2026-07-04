/**
 * その他の多変量解析（H-5）トピックの計算層（純関数）。
 * 多次元尺度構成法（古典的 MDS）を中心に、距離行列・二重中心化・冪乗法による固有分解・ストレスを扱う。
 * 「距離（非類似度）だけから、点の配置を低次元の地図に復元する」多変量可視化の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。2D点は pca.ts の Point2 を再利用。
 */

import type { Point2 } from "./pca";

/** 点集合のユークリッド距離行列（n×n, 対称・対角0）。 */
export function distanceMatrix(points: readonly Point2[]): number[][] {
  const n = points.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y),
    ),
  );
}

/** 対称行列の第1固有対（冪乗法）。initV を与えなければ均等ベクトルから。 */
function topEigen(B: readonly number[][], iters = 200): { value: number; vector: number[] } {
  const n = B.length;
  let v = new Array(n).fill(0).map((_, i) => (i === 0 ? 1 : 0.001 * (i + 1)));
  let norm = Math.hypot(...v) || 1;
  v = v.map((x) => x / norm);
  let value = 0;
  for (let it = 0; it < iters; it++) {
    const w = B.map((row) => row.reduce((a, x, j) => a + x * v[j], 0));
    norm = Math.hypot(...w);
    if (norm < 1e-12) break;
    const next = w.map((x) => x / norm);
    // レイリー商で固有値（符号込み）。
    value = v.reduce((a, x, i) => a + x * w[i], 0);
    v = next;
  }
  return { value, vector: v };
}

/** 行列から λ·v·vᵀ を引く（デフレーション）。 */
function deflate(B: number[][], value: number, vector: readonly number[]): number[][] {
  return B.map((row, i) => row.map((x, j) => x - value * vector[i] * vector[j]));
}

/**
 * 古典的 MDS（主座標分析）。距離行列 D から k 次元の配置座標を復元する。
 * B = −½ J D² J（J は中心化行列）を作り、上位 k 個の固有対から coords_i = √λ_p · v_p を得る。
 * 返り値は各点の k 次元座標と、使った固有値。
 */
export function classicalMDS(
  D: readonly (readonly number[])[],
  k = 2,
): { coords: number[][]; eigenvalues: number[] } {
  const n = D.length;
  // 二重中心化。B_ij = −½ (D²_ij − 行平均 − 列平均 + 全平均)。
  const d2 = D.map((row) => row.map((v) => v * v));
  const rowMean = d2.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const grand = rowMean.reduce((a, b) => a + b, 0) / n;
  const B = d2.map((row, i) => row.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + grand)));

  // 上位 k 固有対を冪乗法＋デフレーションで。
  let work = B.map((r) => [...r]);
  const eigenvalues: number[] = [];
  const vectors: number[][] = [];
  for (let p = 0; p < k; p++) {
    const { value, vector } = topEigen(work);
    eigenvalues.push(value);
    vectors.push(vector);
    work = deflate(work, value, vector);
  }
  // coords_i,p = √(max(0,λ_p)) · v_p,i。
  const coords = Array.from({ length: n }, (_, i) =>
    vectors.map((vec, p) => Math.sqrt(Math.max(0, eigenvalues[p])) * vec[i]),
  );
  return { coords, eigenvalues };
}

/**
 * クラスカルのストレス（正規化）。元の距離行列と、復元座標から計算した距離のずれ。
 * stress = √( Σ(d_ij − d̂_ij)² / Σ d_ij² )。0 なら完全再現、大きいほど歪み。
 */
export function kruskalStress(
  D: readonly (readonly number[])[],
  coords: readonly (readonly number[])[],
): number {
  const n = D.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dhat = Math.hypot(...coords[i].map((c, d) => c - coords[j][d]));
      num += (D[i][j] - dhat) ** 2;
      den += D[i][j] ** 2;
    }
  }
  return den > 0 ? Math.sqrt(num / den) : 0;
}

/** 距離行列に対称なノイズを加える（歪み実験用）。scale が大きいほど歪む。決定的（値ベース）。 */
export function distortDistances(D: readonly (readonly number[])[], scale: number): number[][] {
  const n = D.length;
  const out = D.map((row) => [...row]);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 決定的な «擬似ノイズ»（i,j に依存する三角関数）。
      const noise = Math.sin(i * 12.9898 + j * 78.233) * scale;
      const v = Math.max(0, D[i][j] + noise);
      out[i][j] = v;
      out[j][i] = v;
    }
  }
  return out;
}
