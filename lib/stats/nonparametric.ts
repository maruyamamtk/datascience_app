/**
 * ノンパラメトリック法（E-5）トピックの計算層（純関数）。
 * 並べ替え検定（permutation test）・順位（ランク）・ウィルコクソン順位和・スピアマンの順位相関を扱う。
 * 「分布を仮定せず、順位や並べ替えで検定する」手法の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";
import { mean } from "./sample";

export { mean };

/** 2群の平均差 mean(a) − mean(b)。 */
export function meanDiff(a: readonly number[], b: readonly number[]): number {
  return mean(a) - mean(b);
}

/**
 * 並べ替え検定の帰無分布。2群を合併しラベルをランダムに割り直して «平均差» を `shuffles` 回計算する。
 * 帰無仮説«2群は同じ分布»のもとでの平均差の分布。決定的 PRNG で再現可能。
 */
export function permutationNull(
  a: readonly number[],
  b: readonly number[],
  shuffles: number,
  rng: Rng,
): number[] {
  const pooled = [...a, ...b];
  const nA = a.length;
  const out: number[] = [];
  for (let s = 0; s < Math.max(0, Math.floor(shuffles)); s++) {
    // Fisher–Yates シャッフル。
    const arr = [...pooled];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const groupA = arr.slice(0, nA);
    const groupB = arr.slice(nA);
    out.push(mean(groupA) - mean(groupB));
  }
  return out;
}

/**
 * 並べ替え検定の両側 p 値 = 帰無分布で |差| が観測の |差| 以上になる割合。
 * 分布を仮定せず «観測がどれだけ極端か» を直接数える。
 */
export function permutationPValue(observed: number, nullDist: readonly number[]): number {
  if (nullDist.length === 0) return Number.NaN;
  const absObs = Math.abs(observed);
  const count = nullDist.reduce((acc, d) => acc + (Math.abs(d) >= absObs - 1e-12 ? 1 : 0), 0);
  return count / nullDist.length;
}

/** 値の順位（昇順, 1始まり, タイは平均順位）。 */
export function ranks(values: readonly number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((x, y) => x.v - y.v);
  const r = new Array(values.length).fill(0);
  let k = 0;
  while (k < indexed.length) {
    let j = k;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[k].v) j++;
    // k..j がタイ。平均順位 = ((k+1)+(j+1))/2。
    const avg = (k + 1 + (j + 1)) / 2;
    for (let m = k; m <= j; m++) r[indexed[m].i] = avg;
    k = j + 1;
  }
  return r;
}

/**
 * ウィルコクソン順位和検定（マン–ホイットニー）の統計量 W = 群 a の順位和。
 * 合併データに順位を付け、a に属する順位を足す。中央値の差を順位ベースで測る。
 */
export function wilcoxonRankSum(
  a: readonly number[],
  b: readonly number[],
): { W: number; nA: number; nB: number } {
  const pooled = [...a, ...b];
  const r = ranks(pooled);
  const W = a.reduce((acc, _, i) => acc + r[i], 0);
  return { W, nA: a.length, nB: b.length };
}

/**
 * スピアマンの順位相関係数 ρ。各変数を順位に変換してピアソン相関を取る。
 * 単調な関係を測る（直線でなくてよい）。外れ値に頑健。長さ不一致・分散0は NaN。
 */
export function spearman(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return Number.NaN;
  const rx = ranks(x);
  const ry = ranks(y);
  const mx = mean(rx);
  const my = mean(ry);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx;
    const dy = ry[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  if (!(denom > 0)) return Number.NaN;
  return sxy / denom;
}
