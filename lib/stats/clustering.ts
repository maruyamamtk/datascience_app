/**
 * クラスター分析（H-3）トピックの計算層（純関数）。
 * k-means（ロイドのアルゴリズム）の1ステップ・反復、群内平方和（WCSS）、階層クラスタリングの併合を扱う。
 * 「ラベルなしのデータを、近いものどうしまとめてグループに分ける」教師なし学習の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Point2 } from "./pca";
import type { Rng } from "./random";

/** 2点間のユークリッド距離の二乗。 */
export function dist2(a: Point2, b: Point2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/** 各点を最も近い重心に割り当てる（インデックスの配列）。 */
export function assignClusters(points: readonly Point2[], centroids: readonly Point2[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bestD = Infinity;
    centroids.forEach((c, k) => {
      const d = dist2(p, c);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return best;
  });
}

/** 割り当てに基づき各クラスターの重心を更新（空クラスターは元の重心を維持）。 */
export function updateCentroids(
  points: readonly Point2[],
  assignments: readonly number[],
  k: number,
  prev: readonly Point2[],
): Point2[] {
  const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }));
  points.forEach((p, i) => {
    const c = assignments[i];
    sums[c].x += p.x;
    sums[c].y += p.y;
    sums[c].n += 1;
  });
  return sums.map((s, j) => (s.n > 0 ? { x: s.x / s.n, y: s.y / s.n } : prev[j]));
}

/** 群内平方和 WCSS = Σ 各点と割り当て先重心の距離²。小さいほどまとまっている。 */
export function withinClusterSumOfSquares(
  points: readonly Point2[],
  assignments: readonly number[],
  centroids: readonly Point2[],
): number {
  return points.reduce((acc, p, i) => acc + dist2(p, centroids[assignments[i]]), 0);
}

/** k-means の1ステップ（割り当て→重心更新）の結果。 */
export type KmeansStep = {
  assignments: number[];
  centroids: Point2[];
  wcss: number;
};

/** k-means を1ステップ進める（現在の重心から割り当て→新しい重心）。 */
export function kmeansStep(points: readonly Point2[], centroids: readonly Point2[]): KmeansStep {
  const assignments = assignClusters(points, centroids);
  const next = updateCentroids(points, assignments, centroids.length, centroids);
  return {
    assignments,
    centroids: next,
    wcss: withinClusterSumOfSquares(points, assignments, next),
  };
}

/**
 * k-means を収束まで反復。各ステップのスナップショットを返す（コマ送り用）。
 * 重心が動かなくなる（または maxIter）で停止。初期重心は与える。
 */
export function kmeansIterate(
  points: readonly Point2[],
  initial: readonly Point2[],
  maxIter = 20,
): KmeansStep[] {
  const steps: KmeansStep[] = [];
  let centroids = [...initial];
  // ステップ0: 初期割り当て。
  let assignments = assignClusters(points, centroids);
  steps.push({
    assignments,
    centroids: [...centroids],
    wcss: withinClusterSumOfSquares(points, assignments, centroids),
  });
  for (let it = 0; it < maxIter; it++) {
    const next = updateCentroids(points, assignments, centroids.length, centroids);
    const newAssign = assignClusters(points, next);
    const wcss = withinClusterSumOfSquares(points, newAssign, next);
    steps.push({ assignments: newAssign, centroids: next, wcss });
    const moved = newAssign.some((a, i) => a !== assignments[i]);
    centroids = next;
    assignments = newAssign;
    if (!moved) break;
  }
  return steps;
}

/** k-means++ 風の初期重心選択（最初はランダム、以降は遠い点を選びやすく）。決定的 PRNG。 */
export function initCentroids(points: readonly Point2[], k: number, rng: Rng): Point2[] {
  const chosen: Point2[] = [];
  const first = Math.floor(rng() * points.length);
  chosen.push({ ...points[first] });
  while (chosen.length < k) {
    // 各点の «最も近い既存重心への距離²» に比例して選ぶ。
    const d2 = points.map((p) => Math.min(...chosen.map((c) => dist2(p, c))));
    const total = d2.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < points.length; i++) {
      r -= d2[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    chosen.push({ ...points[idx] });
  }
  return chosen;
}

/**
 * 凝集型階層クラスタリング（単連結）の併合系列。距離が最小の2クラスターを順に併合する。
 * 各併合の «結合距離» を返す（デンドログラムの高さ）。小さな点数向け。
 */
export function singleLinkageMerges(
  points: readonly Point2[],
): { a: number; b: number; distance: number }[] {
  // 各クラスターは点インデックスの集合。
  let clusters: number[][] = points.map((_, i) => [i]);
  const merges: { a: number; b: number; distance: number }[] = [];
  const linkDist = (c1: number[], c2: number[]) => {
    let m = Infinity;
    for (const i of c1) for (const j of c2) m = Math.min(m, Math.sqrt(dist2(points[i], points[j])));
    return m;
  };
  while (clusters.length > 1) {
    let bi = 0;
    let bj = 1;
    let best = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = linkDist(clusters[i], clusters[j]);
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    }
    merges.push({ a: clusters[bi][0], b: clusters[bj][0], distance: best });
    const merged = [...clusters[bi], ...clusters[bj]];
    clusters = clusters.filter((_, k) => k !== bi && k !== bj);
    clusters.push(merged);
  }
  return merges;
}
