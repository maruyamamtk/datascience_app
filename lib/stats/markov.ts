/**
 * マルコフ連鎖（L-1）トピックの計算層（純関数）。
 * 行確率的な遷移行列による状態分布の推移、定常分布、収束を扱う。
 * 「次の状態は現在の状態だけで決まる（記憶がない）」確率過程の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** 遷移行列 P（行確率的：P[i][j]=P(次=j | 今=i)、各行の和=1）。 */
export type TransitionMatrix = number[][];

/** 行ベクトル分布 π に遷移行列を1回作用させる π' = π P。 */
export function step(pi: readonly number[], P: TransitionMatrix): number[] {
  const n = P.length;
  return Array.from({ length: n }, (_, j) => pi.reduce((acc, pv, i) => acc + pv * P[i][j], 0));
}

/** 初期分布から t ステップ分の分布列（π_0, π_1, …, π_t）を返す。 */
export function evolve(P: TransitionMatrix, pi0: readonly number[], steps: number): number[][] {
  const out: number[][] = [[...pi0]];
  let cur = [...pi0];
  for (let t = 0; t < steps; t++) {
    cur = step(cur, P);
    out.push(cur);
  }
  return out;
}

/**
 * 定常分布 π（πP=π, Σπ=1）を冪乗法で求める。既約・非周期なら一意に収束する。
 * 均等分布から遷移を反復し、変化が十分小さくなったら停止。
 */
export function stationaryDistribution(P: TransitionMatrix, iters = 500): number[] {
  const n = P.length;
  let pi = new Array(n).fill(1 / n);
  for (let t = 0; t < iters; t++) {
    const next = step(pi, P);
    const diff = next.reduce((a, v, i) => a + Math.abs(v - pi[i]), 0);
    pi = next;
    if (diff < 1e-12) break;
  }
  // 正規化（数値誤差の吸収）。
  const s = pi.reduce((a, b) => a + b, 0) || 1;
  return pi.map((v) => v / s);
}

/** 行が確率分布（非負・和1）になっているか。 */
export function isStochastic(P: TransitionMatrix, tol = 1e-9): boolean {
  return P.every((row) => {
    if (row.some((v) => v < -tol)) return false;
    return Math.abs(row.reduce((a, b) => a + b, 0) - 1) < tol;
  });
}

/**
 * 収束の速さの目安：分布が定常分布へどれだけ近づいたか（総変動距離）の列。
 * TV(π_t, π) = ½ Σ|π_t,i − π_i|。0 に近づくほど混合が進んだ。
 */
export function totalVariationToStationary(
  P: TransitionMatrix,
  pi0: readonly number[],
  steps: number,
): number[] {
  const pi = stationaryDistribution(P);
  const seq = evolve(P, pi0, steps);
  return seq.map((pt) => 0.5 * pt.reduce((a, v, i) => a + Math.abs(v - pi[i]), 0));
}

/**
 * 遷移行列に従って状態遷移を1本サンプリング（決定的 PRNG）。開始状態から length ステップ。
 * 返り値は訪れた状態インデックスの列。
 */
export function samplePath(P: TransitionMatrix, start: number, length: number, rng: Rng): number[] {
  const path = [start];
  let s = start;
  for (let t = 0; t < length; t++) {
    const r = rng();
    let cum = 0;
    let next = P.length - 1;
    for (let j = 0; j < P.length; j++) {
      cum += P[s][j];
      if (r <= cum) {
        next = j;
        break;
      }
    }
    path.push(next);
    s = next;
  }
  return path;
}
