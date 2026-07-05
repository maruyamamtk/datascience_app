/**
 * 2次元の線形変換まわりの純関数（線形代数トピック A-1 の計算層）。
 * 行列＝«ベクトルを動かす操作» という見方を可視化するため、2×2 行列のベクトル変換・
 * 行列式（面積拡大率）・トレース・固有値/固有ベクトル（向きを保つ方向）・階数を扱う。
 * 大きな行列や高精度は目的外（MVP の可視化サイズに十分な範囲）。副作用なし（Vitest 対象）。
 * 一般の行列演算（transpose/matMul/inverse/solve）は lib/stats/linalg.ts を再利用する。
 */

import type { Matrix } from "./linalg";

/** 平面ベクトル。 */
export type Vec2 = { x: number; y: number };

/** 2×2 行列 [[a, b], [c, d]]（行優先）。 */
export type Mat2 = { a: number; b: number; c: number; d: number };

/** 行列 M をベクトル v に作用させる M·v。 */
export function apply2(m: Mat2, v: Vec2): Vec2 {
  return { x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y };
}

/** 行列式 det M = ad − bc（符号付き面積拡大率）。 */
export function det2(m: Mat2): number {
  return m.a * m.d - m.b * m.c;
}

/** トレース tr M = a + d（対角和・固有値の和）。 */
export function trace2(m: Mat2): number {
  return m.a + m.d;
}

/** ベクトルの長さ ‖v‖。 */
export function norm2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/**
 * 列ベクトル（基底ベクトルの行き先）。
 * e1=(1,0) → (a, c)、e2=(0,1) → (b, d)。この2本が張る平行四辺形の面積が |det|。
 */
export function columns2(m: Mat2): [Vec2, Vec2] {
  return [
    { x: m.a, y: m.c },
    { x: m.b, y: m.d },
  ];
}

/** 単位円上の点列（n 等分、角度 0 から反時計回り）。 */
export function unitCirclePoints(n: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    pts.push({ x: Math.cos(t), y: Math.sin(t) });
  }
  return pts;
}

/** 点列に行列を作用させる（単位円 → 楕円 の変換など）。 */
export function transformPoints(m: Mat2, pts: readonly Vec2[]): Vec2[] {
  return pts.map((p) => apply2(m, p));
}

/** ベクトル u, v のなす角（度, 0〜180）。零ベクトルは NaN。 */
export function angleBetweenDeg(u: Vec2, v: Vec2): number {
  const nu = norm2(u);
  const nv = norm2(v);
  if (nu === 0 || nv === 0) return Number.NaN;
  const cos = Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (nu * nv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** ベクトルを正規化（零ベクトルはそのまま返す）。 */
export function normalize2(v: Vec2): Vec2 {
  const n = norm2(v);
  if (n === 0) return v;
  return { x: v.x / n, y: v.y / n };
}

/** 固有値・固有ベクトルの計算結果。 */
export type Eigen2 = {
  /** 実固有値を持つか（判別式 ≥ 0）。false のとき回転成分があり実固有ベクトルなし。 */
  real: boolean;
  /** 判別式 tr² − 4·det。 */
  discriminant: number;
  /** 固有値 [λ1, λ2]（実のとき λ1 ≥ λ2）。複素のときは共通の実部を2つ返す。 */
  values: [number, number];
  /** 対応する正規化固有ベクトル（実のときのみ意味を持つ。複素のときは零ベクトル）。 */
  vectors: [Vec2, Vec2];
};

/**
 * (A − λI)v = 0 を満たす正規化ベクトルを1本返す（2×2）。
 * (a−λ)x + b·y = 0 と c·x + (d−λ)y = 0 のうち、係数の大きい行から null 空間を取る。
 */
function eigenvectorFor(m: Mat2, lambda: number): Vec2 {
  const { a, b, c, d } = m;
  // 行1: (a−λ, b) に直交する (−b, a−λ)。行2: (c, d−λ) に直交する (d−λ, −c)。
  const row1 = { x: -b, y: a - lambda };
  const row2 = { x: d - lambda, y: -c };
  const v = norm2(row1) >= norm2(row2) ? row1 : row2;
  // スカラー行列（b=c=0, a=d）等で両方ほぼ零なら、既定の基底方向を返す。
  if (norm2(v) < 1e-12) return { x: 1, y: 0 };
  return normalize2(v);
}

/**
 * 2×2 行列の固有値・固有ベクトル。特性方程式 λ² − (tr)λ + det = 0 を解く。
 * 判別式 tr² − 4det ≥ 0 なら実固有値、負なら複素（回転を含む）。
 */
export function eigen2(m: Mat2): Eigen2 {
  const tr = trace2(m);
  const det = det2(m);
  const disc = tr * tr - 4 * det;
  if (disc < 0) {
    const half = tr / 2;
    return { real: false, discriminant: disc, values: [half, half], vectors: [{ x: 0, y: 0 }, { x: 0, y: 0 }] };
  }
  const s = Math.sqrt(disc);
  const l1 = (tr + s) / 2;
  const l2 = (tr - s) / 2;
  return {
    real: true,
    discriminant: disc,
    values: [l1, l2],
    vectors: [eigenvectorFor(m, l1), eigenvectorFor(m, l2)],
  };
}

/**
 * 行列の階数（ランク）を行簡約（部分ピボット）で数える。
 * 独立な行/列の本数＝変換後に張られる空間の次元。det=0（rank<n）は «つぶれる» 変換。
 */
export function matrixRank(a: Matrix, tol = 1e-9): number {
  // 破壊しないよう複製。
  const m = a.map((row) => [...row]);
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  let rank = 0;
  for (let col = 0; col < cols && rank < rows; col++) {
    // ピボット行（残り行で |値| 最大）を選ぶ。
    let pivot = rank;
    for (let r = rank + 1; r < rows; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < tol) continue;
    [m[rank], m[pivot]] = [m[pivot], m[rank]];
    const pv = m[rank][col];
    for (let r = 0; r < rows; r++) {
      if (r === rank) continue;
      const f = m[r][col] / pv;
      if (f === 0) continue;
      for (let j = col; j < cols; j++) m[r][j] -= f * m[rank][j];
    }
    rank++;
  }
  return rank;
}
