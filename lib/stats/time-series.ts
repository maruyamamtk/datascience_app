/**
 * 時系列解析の基礎（M-1）の計算層（純関数）。
 * 時系列の «トレンド＋季節＋不規則» 分解・移動平均による平滑化・自己相関（ACF）・階差・
 * 定常性の目安（ホワイトノイズの自己相関がほぼ0）を扱う。
 * 「時間で並んだデータの構造（傾向・周期・自己相関）」を読み解く土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。乱数は呼び出し側の Rng に閉じる。
 */

import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 時系列を成分ごとに分解して保持（合成 = trend + seasonal + noise）。 */
export type SeriesParts = {
  /** トレンド成分（直線）。 */
  trend: number[];
  /** 季節成分（周期 period の正弦波）。 */
  seasonal: number[];
  /** 不規則成分（ホワイトノイズ）。 */
  noise: number[];
  /** 合成系列。 */
  value: number[];
};

/**
 * トレンド（傾き slope）＋季節（振幅 amp・周期 period の正弦波）＋ホワイトノイズ（sd）で
 * 長さ n の時系列を合成する。時系列を «3成分の重ね合わせ» として理解する土台。
 */
export function generateSeries(params: {
  n: number;
  slope: number;
  amp: number;
  period: number;
  noiseSd: number;
  base?: number;
  rng: Rng;
}): SeriesParts {
  const { n, slope, amp, period, noiseSd, base = 0, rng } = params;
  const trend: number[] = [];
  const seasonal: number[] = [];
  const noise: number[] = [];
  const value: number[] = [];
  for (let t = 0; t < n; t++) {
    const tr = base + slope * t;
    const se = amp * Math.sin((2 * Math.PI * t) / period);
    const no = noiseSd * gauss(rng);
    trend.push(tr);
    seasonal.push(se);
    noise.push(no);
    value.push(tr + se + no);
  }
  return { trend, seasonal, noise, value };
}

/** 標本平均。 */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * 中心化移動平均（窓幅 window、奇数推奨）。端は窓が収まる範囲だけで平均する。
 * 高周波の «ギザギザ» を均し、トレンド＋季節の滑らかな動きを取り出す。
 */
export function movingAverage(xs: readonly number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(xs.length - 1, i + half);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += xs[j];
    out.push(sum / (hi - lo + 1));
  }
  return out;
}

/**
 * ラグ k の自己共分散 γ(k)=(1/n)Σ_{t}(x_t−x̄)(x_{t+k}−x̄)。
 * 時系列では «n で割る» 定義（バイアスはあるが半正定値になる標準的な推定）を使う。
 */
export function autocovariance(xs: readonly number[], k: number): number {
  const n = xs.length;
  if (n === 0 || k >= n) return 0;
  const m = mean(xs);
  let sum = 0;
  for (let t = 0; t < n - k; t++) sum += (xs[t] - m) * (xs[t + k] - m);
  return sum / n;
}

/** ラグ k の自己相関 ρ(k)=γ(k)/γ(0)。ρ(0)=1。 */
export function autocorrelation(xs: readonly number[], k: number): number {
  const g0 = autocovariance(xs, 0);
  if (g0 === 0) return k === 0 ? 1 : 0;
  return autocovariance(xs, k) / g0;
}

/** ラグ 0..maxLag の自己相関列（コレログラム＝ACF プロット用）。 */
export function acf(xs: readonly number[], maxLag: number): number[] {
  return Array.from({ length: maxLag + 1 }, (_, k) => autocorrelation(xs, k));
}

/**
 * 1階の階差 Δx_t = x_t − x_{t−1}（長さ n−1）。トレンドを取り除いて定常に近づける基本操作。
 */
export function difference(xs: readonly number[]): number[] {
  const out: number[] = [];
  for (let t = 1; t < xs.length; t++) out.push(xs[t] - xs[t - 1]);
  return out;
}

/**
 * ACF の «ほぼ0» を判定する近似95%信頼限界 ±1.96/√n（ホワイトノイズの目安）。
 * これを超えるラグは «有意な自己相関» とみなす。
 */
export function acfConfidenceBound(n: number): number {
  return n > 0 ? 1.96 / Math.sqrt(n) : 0;
}
