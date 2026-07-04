/**
 * 確率過程（L-2）トピックの計算層（純関数）。
 * ランダムウォーク・ブラウン運動（ウィーナー過程）・ポアソン過程の生成と、
 * 分散の時間発展（∝t）・独立増分・平均などの性質を扱う。
 * 「時間とともにランダムに変化する量」を、増分の積み重ねとして理解する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** 1本の «道»（時刻ごとの値）。 */
export type Path = number[];

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 単純ランダムウォーク。各ステップ ±step を確率 p/(1−p) で加える。drift は上下の偏り。
 * S_0=0 から length ステップ。返り値は S_0..S_length（length+1 個）。
 */
export function randomWalk(params: { length: number; step: number; pUp: number; rng: Rng }): Path {
  const { length, step, pUp, rng } = params;
  const path: Path = [0];
  let s = 0;
  for (let t = 0; t < length; t++) {
    s += rng() < pUp ? step : -step;
    path.push(s);
  }
  return path;
}

/**
 * ブラウン運動（ウィーナー過程）の離散近似。刻み dt ごとに増分 N(μ·dt, σ²·dt) を加える。
 * B_0=0。σ はボラティリティ、μ はドリフト。返り値は各時刻の値。
 */
export function brownianMotion(params: {
  steps: number;
  dt: number;
  sigma: number;
  mu: number;
  rng: Rng;
}): Path {
  const { steps, dt, sigma, mu, rng } = params;
  const path: Path = [0];
  let b = 0;
  for (let t = 0; t < steps; t++) {
    b += mu * dt + sigma * Math.sqrt(dt) * gauss(rng);
    path.push(b);
  }
  return path;
}

/**
 * ポアソン過程の «到着時刻の累積カウント» 過程 N(t)。強度 rate（単位時間あたりの平均到着数）。
 * 各時刻 t_k = k·dt での累積到着数を返す。到着間隔は指数分布（−ln U / rate）。
 */
export function poissonProcess(params: {
  steps: number;
  dt: number;
  rate: number;
  rng: Rng;
}): Path {
  const { steps, dt, rate, rng } = params;
  const T = steps * dt;
  // 到着時刻を指数間隔で生成。
  const arrivals: number[] = [];
  let t = 0;
  while (t < T) {
    t += -Math.log(Math.max(1e-12, rng())) / rate;
    if (t < T) arrivals.push(t);
  }
  // 各グリッド時刻での累積カウント。
  const counts: Path = [];
  for (let k = 0; k <= steps; k++) {
    const time = k * dt;
    counts.push(arrivals.filter((a) => a <= time).length);
  }
  return counts;
}

/** 複数本の道の各時刻の «標本分散»（拡散の広がり）。 */
export function ensembleVariance(paths: readonly Path[]): number[] {
  if (paths.length === 0) return [];
  const len = paths[0].length;
  const n = paths.length;
  const out: number[] = [];
  for (let t = 0; t < len; t++) {
    const vals = paths.map((p) => p[t]);
    const m = vals.reduce((a, b) => a + b, 0) / n;
    out.push(vals.reduce((a, v) => a + (v - m) ** 2, 0) / n);
  }
  return out;
}

/** 複数本の道の各時刻の平均。 */
export function ensembleMean(paths: readonly Path[]): number[] {
  if (paths.length === 0) return [];
  const len = paths[0].length;
  const n = paths.length;
  return Array.from({ length: len }, (_, t) => paths.reduce((a, p) => a + p[t], 0) / n);
}

/** 複数本のブラウン運動を生成（アンサンブル）。 */
export function brownianEnsemble(params: {
  count: number;
  steps: number;
  dt: number;
  sigma: number;
  mu: number;
  rng: Rng;
}): Path[] {
  const { count, ...rest } = params;
  return Array.from({ length: count }, () => brownianMotion(rest));
}
