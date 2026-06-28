/**
 * 判別分析（H-2）トピックの計算層（純関数）。
 * 2クラス・2次元のフィッシャー線形判別（LDA）の判別方向・しきい値・誤判別率・混同行列を扱う。
 * 「2群を最もよく分ける軸を見つけ、その上で境界を引いて分類する」の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。共分散・2D点は pca.ts と同じ形を使う。
 */

import { covariance2, type Cov2, type Point2 } from "./pca";
import type { Rng } from "./random";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** クラスの重心。 */
export function centroid(points: readonly Point2[]): Point2 {
  return { x: mean(points.map((p) => p.x)), y: mean(points.map((p) => p.y)) };
}

/** 2×2 行列の逆行列（[[a,b],[b,c]]）。特異なら null。 */
function inverse2(a: number, b: number, c: number): [number, number, number, number] | null {
  const det = a * c - b * b;
  if (Math.abs(det) < 1e-12) return null;
  return [c / det, -b / det, -b / det, a / det];
}

/** プールした群内共分散（2群の共分散を重み付き平均）。 */
export function pooledWithinCovariance(g1: readonly Point2[], g2: readonly Point2[]): Cov2 {
  const c1 = covariance2(g1);
  const c2 = covariance2(g2);
  const n1 = g1.length;
  const n2 = g2.length;
  const w1 = (n1 - 1) / (n1 + n2 - 2);
  const w2 = (n2 - 1) / (n1 + n2 - 2);
  return {
    sxx: w1 * c1.sxx + w2 * c2.sxx,
    syy: w1 * c1.syy + w2 * c2.syy,
    sxy: w1 * c1.sxy + w2 * c2.sxy,
  };
}

/** フィッシャー線形判別の結果。 */
export type LdaResult = {
  /** 判別方向（重み）w ∝ Σ_w⁻¹ (μ1 − μ2)。単位ベクトル化。 */
  direction: [number, number];
  /** 判別軸への射影のしきい値（2群の射影平均の中点）。 */
  threshold: number;
  /** 各群の重心。 */
  mean1: Point2;
  mean2: Point2;
};

/** 点を判別方向へ射影したスコア。 */
export function score(p: Point2, dir: readonly [number, number]): number {
  return p.x * dir[0] + p.y * dir[1];
}

/**
 * フィッシャー線形判別（2クラス・2次元）。
 * 群内分散に対し群間の隔たりが最大になる方向 w ∝ Σ_w⁻¹(μ1−μ2) を求める。
 * しきい値は2群の射影平均の中点（等事前確率・等共分散の最適境界）。
 */
export function fisherLda(g1: readonly Point2[], g2: readonly Point2[]): LdaResult {
  const m1 = centroid(g1);
  const m2 = centroid(g2);
  const cov = pooledWithinCovariance(g1, g2);
  const inv = inverse2(cov.sxx, cov.sxy, cov.syy);
  const dmx = m1.x - m2.x;
  const dmy = m1.y - m2.y;
  let wx: number;
  let wy: number;
  if (inv) {
    wx = inv[0] * dmx + inv[1] * dmy;
    wy = inv[2] * dmx + inv[3] * dmy;
  } else {
    wx = dmx;
    wy = dmy;
  }
  const norm = Math.hypot(wx, wy) || 1;
  const direction: [number, number] = [wx / norm, wy / norm];
  const s1 = score(m1, direction);
  const s2 = score(m2, direction);
  return { direction, threshold: (s1 + s2) / 2, mean1: m1, mean2: m2 };
}

/** 混同行列・誤判別率。 */
export type Confusion = {
  /** 群1を群1と正しく判別（true positive 相当）。 */
  correct1: number;
  /** 群1を群2と誤判別。 */
  wrong1: number;
  /** 群2を群2と正しく判別。 */
  correct2: number;
  /** 群2を群1と誤判別。 */
  wrong2: number;
  /** 全体の誤判別率。 */
  errorRate: number;
};

/**
 * LDA の境界（score ≥ threshold を群1と判定。群1の射影平均が大きい側）で混同行列・誤判別率を計算。
 * 群1の射影平均がしきい値の «大きい側» になるよう向きを合わせる。
 */
export function classify(g1: readonly Point2[], g2: readonly Point2[], lda: LdaResult): Confusion {
  const s1mean = score(lda.mean1, lda.direction);
  const g1IsHigh = s1mean >= lda.threshold;
  const pred1 = (p: Point2) => {
    const s = score(p, lda.direction);
    return g1IsHigh ? s >= lda.threshold : s < lda.threshold;
  };
  let correct1 = 0;
  let wrong1 = 0;
  let correct2 = 0;
  let wrong2 = 0;
  for (const p of g1) {
    if (pred1(p)) correct1++;
    else wrong1++;
  }
  for (const p of g2) {
    if (pred1(p)) wrong2++;
    else correct2++;
  }
  const total = g1.length + g2.length;
  return { correct1, wrong1, correct2, wrong2, errorRate: total ? (wrong1 + wrong2) / total : 0 };
}

/**
 * 2クラスの2次元データを生成。各群を重心 (±sep/2, 0) 中心の相関ノイズで散らす。
 * 決定的 PRNG で再現可能。
 */
export function generateTwoClasses(params: {
  nPerClass: number;
  separation: number;
  spread: number;
  rng: Rng;
}): { g1: Point2[]; g2: Point2[] } {
  const { nPerClass, separation, spread, rng } = params;
  const make = (cx: number, cy: number): Point2[] =>
    Array.from({ length: nPerClass }, () => ({
      x: cx + gauss(rng) * spread,
      y: cy + gauss(rng) * spread,
    }));
  return {
    g1: make(separation / 2, 0.6),
    g2: make(-separation / 2, -0.6),
  };
}

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
