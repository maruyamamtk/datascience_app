/**
 * 計算多用手法（L-3）の計算層（純関数）。
 * モンテカルロ法（乱数で面積・積分・確率を «たくさん試して数える»）と、
 * ブートストラップ（標本から復元抽出を繰り返し、統計量の «ばらつき»＝標準誤差・信頼区間を推定）を扱う。
 * 解析的に解けない量を «計算資源で押し切る» 手法群の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じ、
 * 固定シードで再現できる。
 */

import type { Rng } from "./random";

/** モンテカルロ π 推定で投げる «ダーツ» の1点（[-1,1]² 上）。 */
export type Dart = { x: number; y: number; inside: boolean };

/**
 * [-1,1]² の正方形に一様に n 個の点を投げ、単位円 x²+y²≤1 の内外を判定する。
 * 円内の割合 → 面積比 π/4 の推定に使う（モンテカルロ法の «試して数える»）。
 */
export function throwDarts(n: number, rng: Rng): Dart[] {
  const darts: Dart[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() * 2 - 1;
    const y = rng() * 2 - 1;
    darts.push({ x, y, inside: x * x + y * y <= 1 });
  }
  return darts;
}

/** ダーツ列から π を推定：正方形面積4 × (円内割合) = 4·k/n。 */
export function estimatePi(darts: readonly Dart[]): number {
  if (darts.length === 0) return 0;
  const inside = darts.reduce((a, d) => a + (d.inside ? 1 : 0), 0);
  return (4 * inside) / darts.length;
}

/** ダーツを1個ずつ足したときの π 推定の推移（収束の «1/√n で揺れが縮む» 様子を見る）。 */
export function runningPiEstimate(darts: readonly Dart[]): number[] {
  const out: number[] = [];
  let inside = 0;
  for (let i = 0; i < darts.length; i++) {
    if (darts[i].inside) inside++;
    out.push((4 * inside) / (i + 1));
  }
  return out;
}

/**
 * モンテカルロ積分：∫_a^b f(x) dx ≈ (b−a)·(1/n)Σ f(U_i)、U_i は [a,b] 一様。
 * «期待値を平均で近似する» のがモンテカルロ積分の要。
 */
export function monteCarloIntegrate(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
  rng: Rng,
): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += f(a + rng() * (b - a));
  return ((b - a) * sum) / n;
}

/** 標本平均。 */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 標本標準偏差（不偏, n−1）。 */
export function sampleStd(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1));
}

/**
 * 復元抽出（bootstrap resample）：元標本 sample から «同じ大きさ» を重複ありで引く。
 * 同じ観測が何度も選ばれ得るのがブートストラップの核心（«観測の重み» を揺らす）。
 */
export function resample<T>(sample: readonly T[], rng: Rng): T[] {
  const n = sample.length;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(sample[Math.floor(rng() * n)]);
  return out;
}

/**
 * ブートストラップ分布：復元抽出を B 回行い、各再標本で統計量 statistic を計算した B 個の値。
 * この «統計量のばらつき» が、その統計量の標準誤差・信頼区間の推定になる。
 */
export function bootstrapStatistics(
  sample: readonly number[],
  statistic: (xs: readonly number[]) => number,
  B: number,
  rng: Rng,
): number[] {
  const out: number[] = [];
  for (let b = 0; b < B; b++) out.push(statistic(resample(sample, rng)));
  return out;
}

/**
 * ブートストラップ標準誤差 = ブートストラップ分布の標準偏差。
 * «統計量が標本ごとにどれだけ動くか» の推定値。
 */
export function bootstrapStandardError(values: readonly number[]): number {
  return sampleStd(values);
}

/** 昇順ソート済み配列の p 分位点（0≤p≤1, 線形補間）。 */
export function quantileSorted(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h = (n - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * パーセンタイル信頼区間：ブートストラップ分布の下側 α/2・上側 1−α/2 分位点。
 * 例 α=0.05 → [2.5%, 97.5%] 点が 95% 信頼区間。分布の «裾» を直接読むだけで区間が出る。
 */
export function percentileInterval(
  values: readonly number[],
  alpha: number,
): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  return [quantileSorted(sorted, alpha / 2), quantileSorted(sorted, 1 - alpha / 2)];
}
